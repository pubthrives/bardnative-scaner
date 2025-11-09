// app/api/scan-site/route.ts
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import https from "https";

/* ---------------- CONFIG ---------------- */
const FETCH_TIMEOUT = 20000;
const MAX_PAGES = 500; // Increased from 400
const ANALYZE_LIMIT = Infinity; // No limit
const REQUIRED_PAGES = ["about", "contact", "privacy", "terms", "disclaimer"];

const OPENAI_KEY: string | undefined = process.env.OPENAI_API_KEY;
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

/* ---------------- HELPERS ---------------- */
async function fetchHTML(url: string): Promise<string> {
  try {
    const res = await axios.get(url, {
      timeout: FETCH_TIMEOUT,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
      },
      httpsAgent: new https.Agent({ rejectUnauthorized: false }),
      maxRedirects: 5,
    });
    return res.data;
  } catch (err: any) {
    console.warn(`⚠️ Failed to fetch: ${url} — ${err?.message}`);
    return "";
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html || "");
  const baseHost = new URL(baseUrl).hostname;
  const links = new Set<string>();

  $("a[href]").each((_, el) => {
    const href = $(el).attr("href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:")) return;
    try {
      const full = new URL(href, baseUrl).href;
      const host = new URL(full).hostname;
      if (host === baseHost) {
        if (
          !full.match(
            /\.(jpg|jpeg|png|gif|svg|pdf|zip|mp4|mp3|ico|css|js)$/i
          ) &&
          !full.includes("?replytocom=")
        ) {
          links.add(full);
        }
      }
    } catch {}
  });

  return Array.from(links);
}

/* ----------- STRONGER POST FILTER ----------- */
function isLikelyPostUrl(url: string): boolean {
  const u = url.toLowerCase();
  const path = new URL(u).pathname;
  const segments = path.split("/").filter(Boolean);

  // ❌ skip category-like URLs
  if (
    /\/(category|tag|page|author|feed|search|wp-json|archive)\//.test(u) ||
    segments.length === 0
  )
    return false;

  // ✅ posts often contain words or years and multiple slashes
  if (segments.length >= 2) return true; // Reduced from 3 to 2
  if (/\b(20\d{2}|19\d{2})\b/.test(u)) return true;
  if (segments.some((s) => /^[a-z0-9-]+$/.test(s) && s.length > 4)) return true; // Reduced from 6 to 4

  return false;
}

function checkRequiredPages(allLinks: string[]): { found: string[]; missing: string[] } {
  const found: string[] = [];
  const missing: string[] = [];
  for (const page of REQUIRED_PAGES) {
    const match = allLinks.find((l) => l.toLowerCase().includes(page));
    if (match) found.push(page);
    else missing.push(page);
  }
  return { found, missing };
}

// ✅ Pre-filter to skip obviously safe content
function isSafeContent(text: string): boolean {
  const safeKeywords = [
    "how to", "tutorial", "guide", "tips", "review", "best", "top", 
    "education", "learning", "news", "updates", "opinion", "analysis",
    "recipe", "cooking", "travel", "lifestyle", "fitness", "health"
  ];
  
  const dangerKeywords = [
    "casino", "betting", "gamble", "porn", "sex", "scam", "fake download",
    "lottery", "win money", "get rich", "miracle cure", "hack", "crack",
    "torrent", "free iphone", "make money fast", "hate speech"
  ];

  const lower = text.toLowerCase();
  
  // If danger keywords found, analyze it
  if (dangerKeywords.some(kw => lower.includes(kw))) return false;
  
  // If safe keywords found, skip analysis
  if (safeKeywords.some(kw => lower.includes(kw))) return true;
  
  return false;
}

// ✅ Enhanced AI analysis with strict violation detection
async function analyzeTextWithAI(text: string) {
  if (!openai) return { violations: [], summary: "API key missing", suggestions: [] };
  
  // Pre-filter safe content
  if (isSafeContent(text)) {
    return { violations: [], summary: "Safe content", suggestions: [] };
  }
  
  try {
    const res = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.1, // More consistent
      max_tokens: 700,
      messages: [
        {
          role: "system",
          content: `
You are a STRICT AdSense policy auditor. ONLY flag clear, serious violations.
Return valid JSON:
{
  "violations": [
    {
      "type": "Adult|Gambling|Scam|Fake|Harmful|Hate",
      "excerpt": "short quote",
      "confidence": 0.95
    }
  ],
  "summary": "Brief explanation",
  "suggestions": ["Remove adult content", "Fix misleading claims"]
}

🔴 STRICT RULES:
- ONLY flag if 100% sure — DO NOT GUESS
- IGNORE: General topics, educational content, news, opinions
- IGNORE: Mild language, neutral descriptions
- Return empty arrays if no clear violations

🟢 FLAG ONLY IF:
- Explicit sexual content
- Gambling/betting promotion
- Scams/fraud schemes
- Fake software/downloads
- Harmful/deceptive practices
- Hate speech or violence promotion

Example violations:
❌ "This article discusses online casinos"
✅ "Visit our casino site to win big money"
`,
        },
        { role: "user", content: text.slice(0, 16000) },
      ],
    });

    const raw = res.choices?.[0]?.message?.content || "";
    const clean = raw.replace(/```json|```/gi, "").trim();
    const match = clean.match(/\{[\s\S]*\}/);
    let json = match ? JSON.parse(match[0]) : { violations: [], summary: "", suggestions: [] };
    
    // ✅ Filter high confidence violations
    if (Array.isArray(json.violations)) {
      json.violations = json.violations.filter((v: any) => v.confidence > 0.8);
    }
    
    return json;
  } catch (err: any) {
    console.error("❌ AI failed:", err.message);
    return { violations: [], summary: "AI error", suggestions: [] };
  }
}

/* ------------- MAIN HANDLER ------------- */
export async function POST(req: Request) {
  try {
    const { url } = await req.json();
    if (!url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    console.log(`🚀 Starting strict post-only scan for: ${url}`);

    const homepage = await fetchHTML(url);
    if (!homepage) throw new Error("Failed to fetch homepage");

    const allLinks = extractLinks(homepage, url);
    const { found, missing } = checkRequiredPages(allLinks);

    // Crawl more to gather potential posts
    let crawled = new Set(allLinks);
    const crawlPromises = allLinks.slice(0, 15).map(async (link) => { // Increased from 10 to 15
      if (crawled.size > MAX_PAGES) return;
      const html = await fetchHTML(link);
      if (!html) return;
      extractLinks(html, url).forEach((l) => crawled.add(l));
    });

    // Wait for all crawling to complete
    await Promise.all(crawlPromises);

    // ✅ Filter for likely post URLs only
    const posts = Array.from(crawled).filter(isLikelyPostUrl);
    const uniquePosts = Array.from(new Set(posts));
    const totalPosts = uniquePosts.length;
    const postsToScan = uniquePosts; // Analyze ALL posts

    console.log(`📰 Found ${totalPosts} post-like URLs — analyzing ${postsToScan.length}`);

    // Analyze homepage
    const $ = cheerio.load(homepage);
    const hasMetaTags = $("meta[name='description']").length > 0;
    const hasGoodHeaders = $("h1,h2,h3").length > 2;
    
    // ✅ Extract full context for homepage
    const title = $("title").text().trim();
    const h1 = $("h1").first().text().trim();
    const metaDesc = $("meta[name='description']").attr("content") || "";
    const bodyText = $("body").text().replace(/\s+/g, " ").slice(0, 16000);
    
    const homepageContext = `
TITLE: ${title}
H1: ${h1}
META: ${metaDesc}
CONTENT: ${bodyText}
`.slice(0, 16000);
    
    const homepageAI = await analyzeTextWithAI(homepageContext);

    // Analyze ALL posts concurrently
    const pagesWithViolations: any[] = [];
    const concurrency = 10; // Increased from 8

    const batch = async (arr: string[], size: number) => {
      for (let i = 0; i < arr.length; i += size) {
        await Promise.all(
          arr.slice(i, i + size).map(async (p) => {
            const html = await fetchHTML(p);
            if (!html) return;
            
            // ✅ Extract full context for posts
            const $ = cheerio.load(html);
            const title = $("title").text().trim();
            const h1 = $("h1").first().text().trim();
            const metaDesc = $("meta[name='description']").attr("content") || "";
            const bodyText = $("main, article, .post-content, .entry-content, .content")
              .text()
              .replace(/\s+/g, " ")
              .trim();
              
            const fullContext = `
TITLE: ${title}
H1: ${h1}
META: ${metaDesc}
CONTENT: ${bodyText}
`.slice(0, 16000);

            if (fullContext.length < 200) return;
            const ai = await analyzeTextWithAI(fullContext);
            if (ai.violations?.length > 0) {
              pagesWithViolations.push({ url: p, ...ai });
            }
          })
        );
      }
    };

    await batch(postsToScan, concurrency);

    const totalViolations =
      (homepageAI.violations?.length || 0) +
      pagesWithViolations.reduce((sum, p) => sum + (p.violations?.length || 0), 0);

    /* ---------- Scoring ---------- */
    let score = 100;
    score -= totalViolations * 10;
    score -= missing.length * 5;
    if (totalPosts < 40) score -= 10;
    if (totalPosts < 20) score -= 10;
    if (!hasMetaTags) score -= 5;
    if (!hasGoodHeaders) score -= 5;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const aiSuggestions = [
      ...(homepageAI.suggestions || []),
      ...pagesWithViolations.flatMap((p) => p.suggestions || []),
    ];
    if (missing.length > 0) aiSuggestions.push(`Add missing pages: ${missing.join(", ")}`);

    const summary =
      totalViolations > 0
        ? `${totalViolations} violations found across ${pagesWithViolations.length} posts.`
        : totalPosts < 20
        ? `Low content (${totalPosts} posts).`
        : `✅ Site appears compliant.`;

    const result: any = {
      url,
      totalViolations,
      requiredPages: { found, missing },
      siteStructure: {
        postCount: totalPosts,
        hasMetaTags,
        hasGoodHeaders,
        structureWarnings: [
          !hasMetaTags ? "Missing meta description" : null,
          !hasGoodHeaders ? "Weak header structure" : null,
          totalPosts < 40 ? "Low content volume" : null,
        ].filter(Boolean) as string[],
      },
      pagesWithViolations,
      aiSuggestions: aiSuggestions.slice(0, 10),
      score,
      summary,
      scannedAt: new Date().toISOString(),
    };

    console.log(`✅ Scan complete for ${url}: ${totalPosts} posts, ${totalViolations} issues, score ${score}/100`);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("🚨 Fatal scan error:", err.message);
    return NextResponse.json({ error: "Scan failed", message: err.message }, { status: 500 });
  }
}
