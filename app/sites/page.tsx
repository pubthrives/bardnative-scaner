// app/sites/page.tsx
"use client";

import React, { useState } from "react";
import axios from "axios";
import toast, { Toaster } from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Globe, Loader2, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

const LOCAL_KEY = "guardian_violations";

function saveViolationsToStorage(newResults: any[]) {
    const existing = JSON.parse(localStorage.getItem(LOCAL_KEY) || "[]");
    const mergedMap = new Map(existing.map((e: any) => [e.url, e]));
    for (const r of newResults) mergedMap.set(r.url, r);
    const updated = Array.from(mergedMap.values());
    localStorage.setItem(LOCAL_KEY, JSON.stringify(updated));
    window.dispatchEvent(new Event("storage"));
    return updated;
}

export default function SitesPage() {
    const router = useRouter();
    const [mode, setMode] = useState("single");
    const [singleUrl, setSingleUrl] = useState("");
    const [multiUrls, setMultiUrls] = useState("");
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState("Ready to scan");

    const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

    // ✅ Single Site Scan
    async function handleSingleScan() {
        if (!singleUrl.trim() || !singleUrl.startsWith("http")) {
            toast.error("Please enter a valid site URL");
            return;
        }

        setLoading(true);
        setStatus("Connecting to scanner...");
        setProgress(5);
        toast.loading(`Scanning ${singleUrl}...`, { id: "scan" });

        try {
            const updateSteps = [
                "Fetching homepage...",
                "Analyzing structure...",
                "Running AI audit...",
                "Evaluating compliance...",
                "Finalizing report...",
            ];

            for (let i = 0; i < updateSteps.length; i++) {
                setStatus(updateSteps[i]);
                setProgress((i + 1) * 18);
                await wait(500);
            }

            const res = await axios.post("/api/scan-site", {
                url: singleUrl.trim(),
            });

            if (!res.data || res.data.error) {
                throw new Error(res.data?.message || "Scan failed");
            }

            saveViolationsToStorage([res.data]);
            setProgress(100);
            setStatus("Scan complete");
            toast.success(`Scan complete for ${singleUrl}`, { id: "scan" });
            
            // Redirect to violations page after successful scan
            setTimeout(() => {
                router.push("/violations");
            }, 1500);
        } catch (err: any) {
            console.error("❌ Scan failed:", err?.response?.data || err?.message || err);
            toast.error(
                `Failed: ${err?.response?.data?.message || err?.message || "Network error"}`,
                { id: "scan" }
            );
            setStatus("Scan failed");
        } finally {
            await wait(1000);
            setLoading(false);
            setSingleUrl("");
            setProgress(0);
            setStatus("Ready to scan");
        }
    }

    // ✅ Multiple Site Scan
    async function handleMultipleScan() {
        const urls = multiUrls
            .split("\n")
            .map((u) => u.trim())
            .filter((u) => u.startsWith("http"));

        if (urls.length === 0) {
            toast.error("Please enter at least one valid URL");
            return;
        }

        toast.loading(`Scanning ${urls.length} sites...`, { id: "batch" });
        setLoading(true);

        for (let i = 0; i < urls.length; i++) {
            setProgress(Math.round(((i + 1) / urls.length) * 100));
            setStatus(`Scanning ${i + 1}/${urls.length}`);

            try {
                const res = await axios.post("/api/scan-site", { url: urls[i] });
                if (res.data) saveViolationsToStorage([res.data]);
                toast.success(`Scanned ${urls[i]}`, { id: `batch-${i}` });
            } catch (err: any) {
                console.warn(`⚠️ Skipped ${urls[i]}: ${err?.message || err}`);
                toast.error(`Failed ${urls[i]}`, { id: `batch-${i}` });
            }

            await wait(600);
        }

        toast.success(`✅ Scanned ${urls.length} sites!`, { id: "batch" });
        setLoading(false);
        setProgress(0);
        setStatus("Batch scan complete");
        setMultiUrls("");
        
        // Redirect to violations page after successful batch scan
        setTimeout(() => {
            router.push("/violations");
        }, 1500);
    }

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <Toaster position="top-right" />

            <div className="max-w-3xl mx-auto px-6 py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 mb-4">
                        <Globe className="text-blue-600" size={24} />
                    </div>
                    <h1 className="text-3xl font-semibold text-gray-900">PolicyGuard</h1>
                    <p className="text-gray-500 mt-2">AI-powered website compliance scanner</p>
                </motion.div>

                {/* Tabs */}
                <div className="flex justify-center mb-8">
                    <div className="inline-flex bg-gray-100 p-1 rounded-xl">
                        {["single", "multiple"].map((m) => (
                            <motion.button
                                key={m}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => setMode(m)}
                                className={`px-5 py-2 text-sm font-medium rounded-lg transition-colors ${mode === m
                                    ? "bg-white text-gray-900 shadow-sm"
                                    : "text-gray-600 hover:text-gray-900"
                                    }`}
                            >
                                {m === "single" ? "Single Site" : "Multiple Sites"}
                            </motion.button>
                        ))}
                    </div>
                </div>

                {/* Single Site */}
                {mode === "single" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
                    >
                        <div className="flex gap-3">
                            <input
                                type="text"
                                placeholder="https://example.com"
                                value={singleUrl}
                                onChange={(e) => setSingleUrl(e.target.value)}
                                className="flex-1 border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                disabled={loading}
                            />
                            <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSingleScan}
                                disabled={loading}
                                className={`px-5 py-3 rounded-lg text-sm font-medium transition ${loading
                                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                    : "bg-blue-600 text-white hover:bg-blue-700"
                                    }`}
                            >
                                {loading ? (
                                    <span className="flex items-center gap-2">
                                        <Loader2 className="animate-spin" size={16} /> Scanning
                                    </span>
                                ) : (
                                    "Scan"
                                )}
                            </motion.button>
                        </div>

                        {/* Progress */}
                        <AnimatePresence>
                            {loading && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="mt-6"
                                >
                                    <div className="flex justify-between text-xs text-gray-500 mb-2">
                                        <span>{status}</span>
                                        <span>{progress}%</span>
                                    </div>
                                    <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                        <motion.div
                                            initial={{ width: "0%" }}
                                            animate={{ width: `${progress}%` }}
                                            className="h-full bg-blue-500 rounded-full"
                                        />
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                )}

                {/* Multiple Sites */}
                {mode === "multiple" && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6"
                    >
                        <textarea
                            rows={5}
                            placeholder="Enter one URL per line&#10;https://example1.com&#10;https://example2.com"
                            value={multiUrls}
                            onChange={(e) => setMultiUrls(e.target.value)}
                            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition mb-4"
                            disabled={loading}
                        />
                        <motion.button
                            whileTap={{ scale: 0.98 }}
                            onClick={handleMultipleScan}
                            disabled={loading}
                            className={`w-full py-3 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition ${loading
                                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                : "bg-green-600 text-white hover:bg-green-700"
                                }`}
                        >
                            {loading ? (
                                <Loader2 className="animate-spin" size={16} />
                            ) : (
                                <>
                                    <Shield size={16} /> Scan All Sites
                                </>
                            )}
                        </motion.button>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
