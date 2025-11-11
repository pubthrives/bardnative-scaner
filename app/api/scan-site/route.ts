// app/api/scan-site/route.ts
import axios from "axios";
import * as cheerio from "cheerio";
import OpenAI from "openai";
import { NextResponse } from "next/server";
import https from "https";
// --- FIXED IMPORT ---
// Import the type for the cheerio function/object ($)
import type { $ } from "cheerio";

/* ---------------- CONFIG ---------------- */
const FETCH_TIMEOUT = 20000;
const MAX_PAGES = 500;
const ANALYZE_LIMIT = Infinity;
const REQUIRED_PAGES = ["about", "contact", "privacy", "terms", "disclaimer"];
const MIN_CONTENT_WORDS = 300; // Minimum word count for "good" content

// Use GPT-4o-mini for cost-effective analysis
const OPENAI_KEY: string | undefined = process.env.OPENAI_API_KEY;
const openai = OPENAI_KEY ? new OpenAI({ apiKey: OPENAI_KEY }) : null;

/* ---------------- HELPERS ---------------- */
async function fetchHTML(url: string): Promise<string> {
  console.log(`🌐 Fetching: ${url}`);
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
    console.log(`✅ Fetched: ${url} (${res.data.length} chars)`);
    return res.data;
  } catch (err: any) {
    console.warn(`⚠️ Failed to fetch: ${url} — ${err?.message}`);
    return "";
  }
}

function extractLinks(html: string, baseUrl: string): string[] {
  // --- CORRECTED TYPE USAGE ---
  const $: $ = cheerio.load(html || ""); // Use the imported $ type
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

  console.log(`🔗 Extracted ${links.size} links from ${baseUrl}`);
  return Array.from(links);
}

/* ----------- SMART POST FILTER (FIXED - Less Aggressive) ----------- */
function isLikelyPostUrl(url: string): boolean {
  const u = url.toLowerCase();
  const urlObj = new URL(u);
  const path = urlObj.pathname;
  const segments = path.split("/").filter(Boolean); // Remove empty strings like from leading '/'

  // Remove fragment/anchor from URL for comparison
  const cleanUrl = u.split('#')[0];
  
  // ❌ skip URLs with fragments (they're duplicates of the main page)
  if (urlObj.hash) {
    console.log(`❌ Skipping fragment URL: ${u}`);
    return false;
  }

  // 🔴 Check for specific tool/download keywords in the path FIRST.
  // If these keywords are found, we want to analyze the page regardless of other patterns.
  const toolKeywords = [
    'download', 'torrent', 'crack', 'keygen', 'serial', 'hack', 'patch', 'key', 'activation',
    'free-download', 'download-free', 'free-torrent', 'torrent-download',
    'cracked', 'crack-download', 'crack-free',
    'apk-download', 'apk-free', 'app-download', 'app-free',
    'software-download', 'software-free', 'free-software',
    'movie-download', 'movie-free', 'free-movie', 'torrent-movie',
    'music-download', 'music-free', 'free-music', 'torrent-music',
    'downloader', // Added 'downloader' as a keyword to trigger analysis
    'video-downloader', 'audio-downloader', 'mp3-downloader', 'mp4-downloader',
    'instagram-downloader', 'tiktok-downloader', 'youtube-downloader', 'facebook-downloader',
    'soundcloud-downloader', 'twitch-downloader', 'pinterest-downloader'
  ];
  
  // Check if any tool keyword appears in the path segments or the full path
  if (toolKeywords.some(keyword => path.includes(keyword))) {
    console.log(`🔍 Identified as POTENTIAL TOOL/DOWNLOAD URL (will analyze): ${u}`);
    return true; // Return TRUE to ensure these are analyzed, overriding other filters
  }

  // ❌ skip obvious category/archive pages (excluding /downloader/ now via keyword check above)
  const obviousCategoryPatterns = [
    /\/(category|tag|author|feed|search|wp-json|archive|tools|tool|blog|news|events|products|services|portfolio|projects|members|groups|forums|topics|threads|comments|reviews|testimonials|faq|support|help|docs|documentation|tutorials|guides|resources|media|galleries|photos|images|videos|audio|music|files|attachments|uploads|admin|login|register|signup|cart|checkout|shop|store|pricing|plans|packages|deals|offers|promotions|campaigns|banners|ads|advertising|sponsors|partners|affiliates|referrals|tracking|stats|statistics|analytics|reports|dashboards|control|control-panel|settings|preferences|profile|account|user|users|members|dashboard|admin-panel|wp-admin|wp-content|wp-includes|cgi-bin|bin|includes|inc|lib|libraries|modules|plugins|themes|templates|layouts|designs|styles|css|js|javascript|scripts|api|json|xml|rss|atom|sitemap|robots|favicon|apple-touch-icon|manifest|browserconfig|humans|readme|license|copyright|trademark|patent|privacy-policy|terms-of-service|tos|eula|end-user-license-agreement|disclaimer|refund-policy|return-policy|shipping-policy|delivery-policy|warranty|guarantee|money-back|moneyback|satisfaction|security|ssl|tls|encryption|certificate|cert|keys|key|token|access|password|pass|login|signin|sign-in|sign_up|signup|register|registration|subscribe|subscription|newsletter|mailing|mail|email|e-mail|contact-us|contactus|contact_form|form|feedback|support|help|ticket|issue|bug|report|complaint|claim|request|inquiry|question|faq|frequently-asked-questions|about-us|aboutus|about|company|team|staff|employees|careers|jobs|employment|work|hire|recruitment|apply|application|resume|cv|portfolio|projects|services|solutions|products|features|benefits|advantages|pros|cons|comparison|vs|versus|alternative|alternatives|review|reviews|rating|ratings|testimonials|testimony|testimonial|recommendation|recommendations|endorsement|endorsements|praise|praises|award|awards|certification|certifications|license|licenses|accreditation|accreditations|membership|memberships|subscription|subscriptions|pricing|price|cost|fee|fees|charge|charges|payment|payments|billing|invoice|receipt|order|orders|purchase|purchases|buy|sell|sale|sales|transaction|transactions|deal|deals|offer|offers|discount|discounts|coupon|coupons|promo|promos|promotion|promotions|campaign|campaigns|marketing|ad|ads|advertisement|advertisements|banner|banners|sponsor|sponsors|partner|partners|affiliate|affiliates|referral|referrals|tracking|track|analytics|stats|statistics|report|reports|dashboard|dashboards|control|controls|setting|settings|preference|preferences|profile|profiles|account|accounts|user|users|member|members|dashboard|admin|signin|sign|apply|award|benefit|cart|certificate|charge|checkout|claim|comment|compare|complaint|compliance|confirm|confirmation|contact|content|contract|contribute|contributor|control|copyright|cost|coupon|create|credit|css|currency|current|custom|customer|customize|cv|data|database|date|day|deactivate|deal|debug|default|delete|deliver|delivery|demo|department|deploy|deposit|design|destroy|detail|developer|development|device|diagnostic|diagram|dialog|dictionary|difference|directory|disable|discuss|discussion|disk|display|document|documentation|domain|donate|donation|download|draft|edit|editor|effect|email|employee|employment|enable|encrypt|encryption|end|engine|enterprise|entry|environment|error|event|example|exchange|execute|exit|experience|export|external|factory|faq|feature|feed|feedback|file|filter|find|fix|flash|folder|font|footer|form|format|forum|forward|framework|free|frequency|friend|ftp|function|fund|gallery|game|gateway|general|generate|generator|get|gift|global|goal|google|govern|governance|group|guide|gzip|header|help|history|home|host|hosting|hour|html|icon|id|idea|identify|identity|image|import|inbox|index|industry|info|information|input|insert|install|instance|institute|instruction|instrument|insurance|integration|interface|internet|interval|intro|introduct|inventory|invite|invoice|ip|issue|item|java|javascript|job|join|journal|js|json|jump|key|keyboard|keyword|label|language|launch|law|layer|layout|leader|lead|learn|legal|level|license|limit|line|link|list|load|local|location|lock|log|login|logo|logout|logotype|main|manage|manager|manual|map|market|master|match|max|maximum|media|member|memory|menu|merge|message|meta|metadata|method|min|minimum|minute|mirror|mobile|mode|model|module|monitor|month|more|move|multi|music|name|navigate|navigation|network|new|news|newsletter|next|no|node|note|notification|notify|number|object|offer|office|offline|offset|online|open|operation|option|order|organization|organize|origin|output|overview|owner|package|page|pagination|panel|paper|paragraph|parent|part|partner|party|pass|password|paste|patch|path|payment|pdf|peer|pending|people|percent|period|permission|permit|person|personal|phone|photo|php|physical|pin|ping|pixel|plan|platform|play|plugin|policy|poll|pop|popular|popup|portal|post|power|preference|premium|present|presentation|preview|previous|price|primary|print|privacy|private|process|processor|product|production|profile|program|progress|project|promo|promotion|protocol|provider|proxy|public|publish|pull|purchase|push|quality|quantity|query|question|queue|quick|quote|radio|random|range|rank|rate|rating|read|reader|reading|ready|real|rebuild|receive|recent|recommend|record|recover|recovery|recruit|recruitment|redirect|reduce|reference|refund|refuse|regenerate|region|register|registration|regular|reject|relation|relationship|release|reload|remove|rename|render|renew|repair|repeat|replace|reply|report|repository|request|require|requirement|rescue|research|reset|resize|resolution|resolve|resource|response|restore|result|resume|retire|return|reverse|review|revoke|right|role|root|route|router|rule|run|safe|sale|sample|save|scale|scan|schedule|schema|scope|score|screen|script|scroll|search|second|section|security|select|self|sell|send|sent|sequence|serial|server|service|session|set|setting|setup|share|shell|shift|shop|show|shutdown|sign|signal|signature|signup|sim|simulation|single|site|size|skill|slide|slot|sms|social|software|solution|sort|source|space|spam|spec|special|specific|specification|speed|spell|spelling|split|sponsor|sport|sql|src|ssl|staff|stage|standard|start|state|static|station|statistic|status|stop|storage|store|stream|string|structure|style|stylesheet|sub|subject|submit|subscribe|subscription|subscript|success|suggest|summary|support|suspend|swap|switch|symbol|sync|synchronize|syntax|system|tab|table|tag|target|task|team|tech|tele|telephone|template|term|terminal|test|text|theme|thread|time|tip|title|tls|to|today|toggle|token|tool|top|topic|total|tour|track|trade|traffic|transaction|transfer|transform|transition|translate|transport|trash|tree|trigger|type|ui|unban|undo|uninstall|union|unit|unlimit|unlock|unmark|unpin|unpublish|unquote|unregister|unrestrict|unsubscribe|unwatch|update|upgrade|upload|url|usage|use|user|username|utility|validate|validation|value|variable|variant|version|video|view|viewer|virtual|virus|visit|visitor|volume|vote|vpn|watch|web|website|week|welcome|widget|wifi|wiki|window|wireless|word|work|worker|workflow|workplace|workspace|world|write|writer|writing|www|xml|year|yes|zip)/,
    /\/page\/\d+/,
    /\/feed$/,
  ];
  
  // Check if URL matches any obvious category pattern (excluding downloader patterns now)
  if (obviousCategoryPatterns.some(pattern => pattern.test(cleanUrl))) {
    console.log(`❌ Skipping obvious category URL: ${u}`);
    return false; // Return FALSE to skip
  }

  // ✅ ACCEPT URLs that look like actual content posts:
  // - Has meaningful segments (not just numbers)
  // - Doesn't match general category patterns (downloader handled above)
  // - Has descriptive slugs
  
  if (segments.length >= 1) {
    const lastSegment = segments[segments.length - 1];
    
    // Accept URLs with descriptive slugs (excluding those caught by toolKeywords above)
    if (lastSegment.length > 4 && 
        !/^\d+$/.test(lastSegment) && 
        !/^(page|category|tag)$/.test(lastSegment)) {
      console.log(`✅ Identified as CONTENT POST: ${u}`);
      return true;
    }
    
    // Also accept URLs that end with / but have descriptive names (common in WordPress)
    if (path.endsWith('/') && segments.length >= 1) {
      const secondLastSegment = segments.length >= 2 ? segments[segments.length - 2] : '';
      if (lastSegment.length > 4 && !/^\d+$/.test(lastSegment)) {
        console.log(`✅ Identified as CONTENT POST (directory-style): ${u}`);
        return true;
      }
    }
  }

  console.log(`❌ Not a content post URL: ${u}`);
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
function isSafeContent(text: string, urlPath: string): boolean {
  // 🔴 CRITICAL FIX: Do NOT skip analysis if the URL path contains known tool keywords
  const toolKeywords = [
    'download', 'torrent', 'crack', 'keygen', 'serial', 'hack', 'patch', 'key', 'activation',
    'free-download', 'download-free', 'free-torrent', 'torrent-download',
    'cracked', 'crack-download', 'crack-free',
    'apk-download', 'apk-free', 'app-download', 'app-free',
    'software-download', 'software-free', 'free-software',
    'movie-download', 'movie-free', 'free-movie', 'torrent-movie',
    'music-download', 'music-free', 'free-music', 'torrent-music',
    'downloader',
    'video-downloader', 'audio-downloader', 'mp3-downloader', 'mp4-downloader',
    'instagram-downloader', 'tiktok-downloader', 'youtube-downloader', 'facebook-downloader',
    'soundcloud-downloader', 'twitch-downloader', 'pinterest-downloader'
  ];

  if (toolKeywords.some(keyword => urlPath.toLowerCase().includes(keyword))) {
    console.log("🔍 URL path contains tool keyword, will analyze regardless of content.");
    return false; // Return FALSE to ensure analysis proceeds
  }

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
  if (dangerKeywords.some(kw => lower.includes(kw))) {
    console.log("🔍 Danger keywords found, will analyze");
    return false;
  }
  
  // If safe keywords found, skip analysis (only if not a tool page)
  if (safeKeywords.some(kw => lower.includes(kw))) {
    console.log("✅ Safe keywords found, skipping analysis");
    return true;
  }
  
  console.log("⚠️ No clear safe/danger keywords, will analyze");
  return false;
}

// Enhanced function to check content quality
function analyzeContentQuality($: $, url: string): { issues: string[]; wordCount: number; hasProperHeadings: boolean } { // Use $ type
  const issues: string[] = [];
  let wordCount = 0;
  let hasProperHeadings = false;

  // Calculate word count from main content
  const contentText = $("main, article, .post-content, .entry-content, .content, .post-body, body").text();
  wordCount = contentText.trim().split(/\s+/).length;

  if (wordCount < MIN_CONTENT_WORDS) {
    issues.push(`Thin content (${wordCount} words < ${MIN_CONTENT_WORDS})`);
  }

  // Check for proper heading hierarchy (H1, H2, H3)
  const h1Count = $("h1").length;
  const h2Count = $("h2").length;
  const h3Count = $("h3").length;
  if (h1Count > 0 && (h2Count > 0 || h3Count > 0)) {
    hasProperHeadings = true;
  } else {
    issues.push("Missing proper heading hierarchy (H1, H2, H3)");
  }

  console.log(`📝 Quality check for ${url}: ${wordCount} words, Headings: ${hasProperHeadings ? 'OK' : 'MISSING'}, Issues: ${issues.length}`);
  return { issues, wordCount, hasProperHeadings };
}

// Enhanced function to detect duplicate content (simple check)
function checkForDuplicateContent(content: string, existingContent: string[]): boolean {
  // Simple check: if content already exists or is very similar (e.g., > 80% overlap)
  const normalizedContent = content.toLowerCase().replace(/\s+/g, ' ').trim();
  for (const existing of existingContent) {
    const normalizedExisting = existing.toLowerCase().replace(/\s+/g, ' ').trim();
    // Simple similarity check (this is a basic heuristic)
    const minLength = Math.min(normalizedContent.length, normalizedExisting.length);
    if (minLength > 100) { // Only check for longer content
        let matches = 0;
        for (let i = 0; i < minLength; i++) {
            if (normalizedContent[i] === normalizedExisting[i]) {
                matches++;
            }
        }
        if (matches / minLength > 0.8) { // 80% overlap
            return true;
        }
    }
  }
  return false;
}

// ✅ STRICT violation detection for CLEAR violations only
function detectClearViolations($: $, url: string): any[] { // Use $ type
  console.log(`🔎 Checking for CLEAR violations on: ${url}`);
  const violations: any[] = [];
  
  // ONLY check for CLEAR, OBVIOUS violations
  const clearViolationPhrases = [
    "cracked software",
    "torrent download",
    "get rich quick",
    "make money fast",
    "win money online",
    "hack tool",
    "keygen",
    "serial number crack",
    "activation key crack",
    "click here to win",
    "amazing offer",
    "limited time",
    "only today",
    "act now",
    "fake review",
    "automated content",
    "cloaked content",
    "doorway page",
    "excessive ads"
  ];
  
  const pageText = $('body').text().toLowerCase();
  clearViolationPhrases.forEach(phrase => {
    if (pageText.includes(phrase)) {
      violations.push({
        type: "Misleading",
        excerpt: `Clear violation phrase found: "${phrase}"`,
        confidence: 0.95
      });
      console.log(`🚨 Clear violation found: ${phrase}`);
    }
  });
  
  // Check for explicit download links to ILLEGAL content
  const illegalDownloadSelectors = [
    'a[href*="crack"]',
    'a[href*="torrent"]',
    'a:contains("Cracked")',
    'a:contains("Torrent")'
  ];
  
  illegalDownloadSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const element = $(el);
      const text = element.text().toLowerCase();
      const href = element.attr('href') || '';
      
      // Only flag if it's clearly illegal content
      if ((text.includes('crack') || text.includes('torrent')) && 
          (text.includes('software') || text.includes('game') || text.includes('movie'))) {
        violations.push({
          type: "Copyright",
          excerpt: `Illegal download link: ${text} (${href})`,
          confidence: 0.9
        });
        console.log(`🚨 Illegal download link found: ${text}`);
      }
    });
  });

  // Check for affiliate links without disclosure
  const affiliateSelectors = [
    'a[href*="amazon.com/dp/"]',
    'a[href*="amazon.com/exec/"]',
    'a[href*="clickbank.net/"]',
    'a[href*="shareasale.com/"]'
  ];
  affiliateSelectors.forEach(selector => {
    $(selector).each((_, el) => {
      const element = $(el);
      const href = element.attr('href') || '';
      // Check if the page mentions "affiliate", "sponsored", "ad", or similar
      const bodyText = $('body').text().toLowerCase();
      if (!bodyText.includes('affiliate') && !bodyText.includes('sponsored') && !bodyText.includes('ad') && !bodyText.includes('disclosure')) {
        violations.push({
          type: "AffiliateDisclosure",
          excerpt: `Affiliate link without disclosure: ${href}`,
          confidence: 0.85
        });
        console.log(`🚨 Affiliate link without disclosure: ${href}`);
      }
    });
  });

  // Check for excessive ad density (simple check for many iframe/ads)
  const adElements = $('iframe[src*="doubleclick"], iframe[src*="googlesyndication"], .adsbygoogle, .ad-container, .advertisement').length;
  if (adElements > 10) { // Arbitrary threshold
    violations.push({
      type: "ExcessiveAds",
      excerpt: `High number of potential ad elements (${adElements})`,
      confidence: 0.8
    });
    console.log(`🚨 High ad density detected: ${adElements} elements`);
  }
  
  console.log(`🔎 Clear violations check complete. Found: ${violations.length}`);
  return violations;
}

// ✅ Enhanced AI analysis with strict violation detection - USING GPT-4o-mini (cost-effective)
// This function now takes the OpenAI client instance as an argument
async function analyzeTextWithAI(text: string, url: string = "", context: string = ""): Promise<any> {
  console.log(`🤖 Analyzing content for: ${url} (${text.length} chars)`);
  
  // Pre-filter safe content
  if (isSafeContent(text, new URL(url).pathname)) {
    console.log("✅ Content pre-filtered as safe, skipping AI analysis.");
    return { violations: [], summary: "Safe content", suggestions: [] };
  }
  
  console.log(`🧠 Sending to AI for analysis: ${url}`);
  
  try {
    const startTime = Date.now();
    const res = await openai.chat.completions.create({ // Use the 'openai' instance defined at the top level
      model: "gpt-4o-mini", // Using the cost-effective model
      temperature: 0.1,
      max_tokens: 800,
      messages: [
        {
          role: "system",
          content: `
You are a STRICT AdSense policy auditor. ONLY flag clear, serious violations.
Return valid JSON:
{
  "violations": [
    {
      "type": "Adult|Gambling|Scam|Fake|Harmful|Hate|Copyright|Misleading|Clickbait|FakeReview|AffiliateDisclosure|Cloaking|Doorway|AutomatedContent|ExcessiveAds",
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
- Explicit sexual content or nudity
- Gambling/betting promotion
- Scams/fraud schemes
- Fake software/downloads
- Harmful/deceptive practices
- Hate speech or violence promotion
- Copyright infringement (pirated content)
- Misleading offers or false promises
- Get-rich-quick schemes
- Illegal activities promotion
- Clickbait headlines
- Fake review patterns
- Affiliate link patterns without disclosure
- Cloaking or hidden content
- Doorway page techniques
- Automated content generation
- Excessive ad density

🔴 SPECIAL ATTENTION:
- "Free download", "cracked", "torrent", "full version" phrases for ILLEGAL content
- Affiliate links for questionable products
- Promotions of illegal activities
- Suspicious monetization methods
- Disguised advertising content

Example violations:
❌ "Download free cracked software here"
✅ "Learn about software development"
❌ "Get rich quick with this method"
✅ "Financial planning tips"
❌ "Amazing offer! Click now!"
✅ "Learn about offers here."
❌ "This product is the best ever! (No evidence)"
✅ "This product has features X, Y, Z."
`,
        },
        { role: "user", content: `URL: ${url}\n\nCONTEXT: ${context}\n\nCONTENT:\n${text.slice(0, 16000)}` },
      ],
    });

    const endTime = Date.now();
    console.log(`⏱️ AI response time: ${endTime - startTime}ms`);
    console.log(`💬 AI tokens used: ${res?.usage?.total_tokens || 'unknown'}`);
    console.log(`📊 AI raw response length: ${res.choices?.[0]?.message?.content?.length || 0}`);

    // --- SAFER PARSING LOGIC ---
    const choice = res.choices?.[0];
    const message = choice?.message;
    const content = message?.content;

    if (!content) {
      console.warn(`⚠️ OpenAI returned empty or invalid content for ${url}. Raw response:`, res);
      // Return a default structure if no content is found
      return { violations: [], summary: "AI returned no content", suggestions: [] };
    }

    const raw = content.replace(/```json|```/gi, "").trim(); // Use 'content' which is guaranteed to be a string here
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) {
      console.warn(`⚠️ Could not find JSON in AI response for ${url}. Raw processed:`, raw);
      return { violations: [], summary: "AI response not in expected JSON format", suggestions: [] };
    }

    const jsonString = match[0];
    const parsedJson = JSON.parse(jsonString);

    // ✅ Filter high confidence violations (only if violations array exists and is an array)
    if (Array.isArray(parsedJson.violations)) {
      const originalCount = parsedJson.violations.length;
      parsedJson.violations = parsedJson.violations.filter((v: any) => v.confidence > 0.8);
      console.log(`📊 AI Violations: ${originalCount} → ${parsedJson.violations.length} (filtered)`);
    } else {
      // Ensure violations is always an array, even if not provided by AI
      parsedJson.violations = [];
    }

    // Ensure other fields exist, provide defaults if not
    if (!parsedJson.summary) parsedJson.summary = "Analysis complete";
    if (!parsedJson.suggestions) parsedJson.suggestions = [];

    console.log(`✅ AI analysis complete for ${url}. Violations: ${parsedJson.violations.length}`);
    return parsedJson;
  } catch (err: any) {
    console.error("❌ AI failed:", err.message);
    if (err.error) {
        console.error("❌ AI API Error Details:", err.error);
    }
    // Return a default structure on error
    return { violations: [], summary: "AI error", suggestions: [] };
  }
}

/* ------------- MAIN HANDLER ------------- */
export async function POST(req: Request) {
  const startTime = Date.now();
  console.log("🚀 Starting scan process");
  
  try {
    const { url } = await req.json();
    console.log(`🎯 Target URL: ${url}`);
    
    if (!url) {
      console.error("❌ URL required");
      return NextResponse.json({ error: "URL required" }, { status: 400 });
    }

    const homepage = await fetchHTML(url);
    if (!homepage) {
      console.error("❌ Failed to fetch homepage");
      throw new Error("Failed to fetch homepage");
    }

    const allLinks = extractLinks(homepage, url);
    const { found, missing } = checkRequiredPages(allLinks);
    console.log(`📋 Required pages - Found: ${found.length}, Missing: ${missing.length}`);

    // Crawl more to gather potential posts
    console.log("🕷️ Starting deep crawl...");
    let crawled = new Set(allLinks);
    const crawlPromises = allLinks.slice(0, 20).map(async (link) => {
      if (crawled.size > MAX_PAGES) return;
      const html = await fetchHTML(link);
      if (!html) return;
      extractLinks(html, url).forEach((l) => crawled.add(l));
    });

    // Wait for all crawling to complete
    await Promise.all(crawlPromises);
    console.log(`🕸️ Crawling complete. Total unique pages: ${crawled.size}`);

    // ✅ Filter for CONTENT post URLs - SMART FILTERING
    const posts = Array.from(crawled)
      .filter(isLikelyPostUrl)
      // Remove fragment duplicates by using base URL only
      .map(postUrl => postUrl.split('#')[0]);
    
    const uniquePosts = Array.from(new Set(posts));
    const totalPosts = uniquePosts.length;
    const postsToScan = uniquePosts;

    console.log(`📰 Found ${totalPosts} CONTENT post URLs — analyzing ${postsToScan.length}`);

    // Analyze homepage
    const $ = cheerio.load(homepage); // Use cheerio to load homepage HTML
    const homepageQuality = analyzeContentQuality($, url);
    const hasMetaTags = $("meta[name='description']").length > 0;
    const hasGoodHeaders = homepageQuality.hasProperHeadings; // Use quality check result
    const homepageStructureIssues = homepageQuality.issues;
    
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
    
    console.log("🏠 Analyzing homepage...");
    const homepageAI = await analyzeTextWithAI(homepageContext, url, "Homepage content analysis");
    
    // Detect CLEAR violations on homepage
    const homepageViolations = detectClearViolations($, url);
    if (homepageViolations.length > 0) {
      // Combine violations and update summary only if there were violations
      homepageAI.violations = [...homepageAI.violations, ...homepageViolations];
      if (homepageAI.summary === "Safe content" && homepageViolations.length > 0) {
        homepageAI.summary = "Policy violations detected";
      }
      console.log(`🏠 Homepage violations: ${homepageViolations.length}`);
    }

    // Track duplicate content across pages
    const allContentHashes: string[] = [];

    // Analyze CONTENT POSTS concurrently
    const pagesWithIssues: any[] = [];
    const concurrency = 12;
    console.log(`🤖 Starting AI analysis of ${postsToScan.length} CONTENT POSTS...`);

    const batch = async (arr: string[], size: number) => {
      for (let i = 0; i < arr.length; i += size) {
        console.log(`📦 Processing batch ${Math.floor(i/size) + 1}/${Math.ceil(arr.length/size)}`);
        await Promise.all(
          arr.slice(i, i + size).map(async (p) => {
            console.log(`📄 Fetching CONTENT POST: ${p}`);
            const html = await fetchHTML(p);
            if (!html) {
              console.log(`❌ Failed to fetch: ${p}`);
              return;
            }
            
            const $post = cheerio.load(html); // Load post HTML with cheerio
            // Analyze content quality for this post
            const postQuality = analyzeContentQuality($post, p);
            
            // ✅ Extract full context for posts
            const title = $post("title").text().trim();
            const h1 = $post("h1").first().text().trim();
            const metaDesc = $post("meta[name='description']").attr("content") || "";
            const bodyText = $post("main, article, .post-content, .entry-content, .content, .post-body")
              .text()
              .replace(/\s+/g, " ")
              .trim();
              
            const fullContext = `
TITLE: ${title}
H1: ${h1}
META: ${metaDesc}
CONTENT: ${bodyText}
`.slice(0, 16000);

            console.log(`📄 Content length for ${p}: ${fullContext.length} chars`);
            if (fullContext.length < 200) {
              console.log(`⏭️ Skipping ${p} - content too short`);
              return;
            }

            // Check for duplicate content
            if (checkForDuplicateContent(bodyText, allContentHashes)) {
                console.log(`⚠️ Duplicate content detected for ${p}`);
                pagesWithIssues.push({
                    url: p,
                    violations: [{
                        type: "DuplicateContent",
                        excerpt: "Content appears to be duplicate or highly similar to other pages",
                        confidence: 0.9
                    }],
                    summary: "Duplicate content detected",
                    suggestions: ["Rewrite content to be unique", "Use canonical tags if necessary"]
                });
                return; // Skip AI analysis for duplicates
            }
            allContentHashes.push(bodyText);

            // Analyze content with AI (using the function defined above, passing the client instance)
            const ai = await analyzeTextWithAI(fullContext, p, "Content post analysis");
            
            // Detect CLEAR violations on each post
            const clearViolations = detectClearViolations($post, p);
            
            // ONLY combine violations if there are ACTUALLY violations
            if (clearViolations.length > 0) {
              // Combine violations and update summary only if there were violations
              ai.violations = [...ai.violations, ...clearViolations];
              if (ai.summary === "Safe content" && clearViolations.length > 0) {
                ai.summary = "Policy violations detected";
              }
              console.log(`📄 Post violations: ${clearViolations.length}`);
            }

            // CRITICAL FIX: ONLY add to violations list if there are ACTUALLY violations
            // NEW LOGIC: Add if AI found violations OR if AI provided specific suggestions (indicating issues)
            const hasViolations = ai.violations?.length > 0;
            const hasSuggestions = ai.suggestions?.length > 0;
            const hasSummaryViolation = ai.summary?.toLowerCase().includes("violation");
            const hasQualityIssues = postQuality.issues.length > 0;

            const shouldAddToIssues = hasViolations || hasSuggestions || hasSummaryViolation || hasQualityIssues;

            if (shouldAddToIssues) {
              const combinedResult = {
                  url: p,
                  ...ai, // Spread AI results (violations, summary, suggestions)
                  qualityIssues: hasQualityIssues ? postQuality.issues : undefined
              };

              // --- IMPROVED SUMMARY LOGIC ---
              let finalSummaryParts = [];
              // Start with the AI's original summary if it mentions violations
              if (hasSummaryViolation) {
                  finalSummaryParts.push(ai.summary);
              } else if (hasViolations) {
                  // If there are violations but summary doesn't mention violation, keep original summary or default
                  if (ai.summary && !ai.summary.toLowerCase().includes("no clear violations")) {
                     finalSummaryParts.push(ai.summary);
                  } else if (ai.summary && ai.summary.toLowerCase().includes("no clear violations")) {
                     // If AI says "no clear" but we have violations, perhaps it was a mistake, just use the violations count
                     finalSummaryParts.push(`${ai.violations.length} violation(s) detected.`);
                  } else {
                     finalSummaryParts.push(`${ai.violations.length} violation(s) detected.`);
                  }
              } else if (hasSuggestions) {
                  // If no violations but has suggestions, prioritize suggestions in summary
                  finalSummaryParts.push(`Potential issues found (AI Suggestions: ${ai.suggestions.join(', ')})`);
              }

              // Add quality issues to the summary if present
              if (hasQualityIssues) {
                  finalSummaryParts.push(`Quality Issues: ${postQuality.issues.join(', ')}`);
              }

              // Combine parts with a separator
              combinedResult.summary = finalSummaryParts.join(' ');

              pagesWithIssues.push(combinedResult);
              console.log(`🚩 Issues found in ${p}: ${ai.violations.length} violations, ${ai.suggestions.length} suggestions, ${postQuality.issues.length} quality issues. Final Summary: ${combinedResult.summary}`);
            } else {
              console.log(`✅ No issues in ${p} - NOT adding to issues list`);
            }
          })
        );
      }
    };

    await batch(postsToScan, concurrency);

    // Count actual unique violations correctly
    let totalViolations = 0;
    pagesWithIssues.forEach(p => {
        totalViolations += (p.violations?.length || 0);
    });
    // Add homepage violations
    totalViolations += (homepageAI.violations?.length || 0);

    console.log(`📊 Total unique violations found: ${totalViolations}`);
    console.log(`📊 Unique pages with ACTUAL issues: ${pagesWithIssues.length}`);

    /* ---------- Scoring ---------- */
    let score = 100;
    
    // Harsher penalties
    score -= totalViolations * 5; // -5 per violation
    score -= missing.length * 5; // -5 per missing page
    score -= homepageStructureIssues.length * 2; // -2 per homepage structure issue
    if (totalPosts < 20) score -= 10; // -10 if < 20 posts
    else if (totalPosts < 40) score -= 5; // -5 if < 40 posts
    if (!hasMetaTags) score -= 3;
    if (!hasGoodHeaders) score -= 3;
    score = Math.max(0, Math.min(100, Math.round(score)));

    const aiSuggestions = [
      ...(homepageAI.suggestions || []),
      ...pagesWithIssues.flatMap((p) => p.suggestions || []),
    ];
    if (missing.length > 0) aiSuggestions.push(`Add missing pages: ${missing.join(", ")}`);
    if (homepageStructureIssues.length > 0) aiSuggestions.push(`Fix homepage structure: ${homepageStructureIssues.join(", ")}`);

    const summary =
      totalViolations > 0
        ? `${totalViolations} violations found across ${pagesWithIssues.length} posts.`
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
          ...(homepageStructureIssues.map(issue => `Homepage: ${issue}`))
        ].filter(Boolean) as string[],
      },
      contentQuality: {
        totalPostsAnalyzed: postsToScan.length,
        postsWithQualityIssues: pagesWithIssues.filter(p => p.qualityIssues).length,
        // Add more detailed quality metrics here if needed
      },
      pagesWithIssues, // Renamed from pagesWithViolations for clarity
      aiSuggestions: aiSuggestions.slice(0, 15),
      score,
      summary,
      scannedAt: new Date().toISOString(),
    };

    const endTime = Date.now();
    console.log(`✅ Scan complete for ${url}: ${totalPosts} CONTENT posts, ${totalViolations} issues, score ${score}/100`);
    console.log(`⏱️ Total scan time: ${endTime - startTime}ms`);
    
    return NextResponse.json(result);
  } catch (err: any) {
    console.error("🚨 Fatal scan error:", err.message);
    // Always return a meaningful error response
    return NextResponse.json({ error: "Scan failed", message: err.message }, { status: 500 });
  }
}

// Health check endpoint
export async function GET() {
  console.log("🩺 Health check called");
  // Check key availability for health check too
  const OPENAI_KEY: string | undefined = process.env.OPENAI_API_KEY;
  const hasKey = !!OPENAI_KEY;
  if (hasKey) {
    try {
        new OpenAI({ apiKey: OPENAI_KEY });
        console.log("✅ Health check: OpenAI client can be initialized");
    } catch (e) {
        console.error("❌ Health check: OpenAI client initialization failed", e);
        return NextResponse.json({ status: "ERROR", hasOpenAIKey: true, message: "OpenAI client init failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ 
    status: "OK", 
    hasOpenAIKey: hasKey,
    timestamp: new Date().toISOString(),
    service: "PolicyGuard API"
  });
}
