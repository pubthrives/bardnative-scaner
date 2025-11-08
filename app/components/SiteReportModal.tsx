// components/SiteReportModal.tsx
"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    AlertTriangle,
    CheckCircle,
    ShieldCheck,
    Brain,
    LayoutGrid,
    Tag,
    Heading,
    ListChecks,
    FileText,
    AlertCircle,
} from "lucide-react";

type ViolationItem = string | { type?: string; description?: string };
type Report = {
    url?: string;
    score?: number;
    scannedAt?: string;
    totalViolations?: number;
    requiredPages?: { found?: string[]; missing?: string[] };
    siteStructure?: {
        postCount?: number;
        hasMetaTags?: boolean;
        hasGoodHeaders?: boolean;
        structureWarnings?: string[];
    };
    pagesWithViolations?: Array<{
        url: string;
        violations: ViolationItem[];
        summary?: string;
    }>;
    aiSuggestions?: Array<string | { toString: () => string }>;
};

export default function SiteReportModal({
    isOpen,
    onClose,
    report,
}: {
    isOpen: boolean;
    onClose: () => void;
    report: Report | null;
}) {
    if (!isOpen || !report) return null;

    const score = report?.score ?? 0;
    const barColor =
        score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-400" : "bg-red-500";

    // ---------- helpers (UI-only) ----------
    const formatViolation = (v: ViolationItem): string => {
        if (typeof v === "string") return v;
        const t = v?.type?.trim();
        const d = v?.description?.trim();
        if (t && d) return `${t}: ${d}`;
        return t || d || "";
    };

    const safeSuggestions = (report.aiSuggestions || []).map((s) =>
        typeof s === "string" ? s : String(s)
    );

    // unified chip system
    const chipBase =
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium";
    const toneClass = (tone: "red" | "amber" | "green") =>
        tone === "red"
            ? "bg-red-50 text-red-700 border border-red-100"
            : tone === "amber"
                ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-green-50 text-green-700 border border-green-100";

    const postsTone = (n: number | undefined): "red" | "amber" | "green" => {
        const v = n ?? 0;
        if (v < 30) return "red";
        if (v < 40) return "amber";
        return "green";
    };

    const structureTone = (pct: number): "red" | "amber" | "green" => {
        if (pct < 60) return "red";
        if (pct < 80) return "amber";
        return "green";
    };

    const structureScore = Math.min(100, (report.siteStructure?.postCount || 0) * 2);

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        role="dialog"
                        aria-modal="true"
                        aria-label="Site Analysis"
                        initial={{ y: 40, opacity: 0, scale: 0.97 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 30, opacity: 0, scale: 0.97 }}
                        transition={{ type: "spring", stiffness: 220, damping: 25 }}
                        className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white w-[min(780px,95vw)] h-[min(80vh,720px)] rounded-2xl shadow-xl border border-gray-200 flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex justify-between items-center border-b border-gray-100 px-6 py-4">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
                                    <ShieldCheck className="text-blue-600" size={18} />
                                </div>
                                <h2 className="text-base font-semibold text-gray-900 truncate">
                                    Site Analysis —{" "}
                                    <span className="text-blue-600">
                                        {new URL(report.url || "").hostname}
                                    </span>
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-md hover:bg-gray-100 transition"
                                aria-label="Close modal"
                            >
                                <X size={18} className="text-gray-500" />
                            </button>
                        </div>

                        {/* Body (scrolls) */}
                        <div className="p-6 space-y-6 flex-1 overflow-y-auto">
                            {/* Score */}
                            <div>
                                <h3 className="text-gray-800 font-medium mb-2">
                                    Overall Site Score: {score}/100
                                </h3>
                                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                                    <div
                                        className={`${barColor} h-2 rounded-full transition-all`}
                                        style={{ width: `${score}%` }}
                                    />
                                </div>
                            </div>

                            {/* Site Structure */}
                            <div className="bg-gray-50 rounded-xl p-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <LayoutGrid className="text-gray-600" size={18} />
                                    <h4 className="text-sm font-semibold text-gray-900">Site Structure</h4>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-gray-800">
                                    {/* Posts Found */}
                                    <div className="flex items-center gap-2">
                                        <ListChecks className="text-gray-500" size={16} />
                                        <div className="text-xs">
                                            <div className="font-medium">Posts</div>
                                            <span
                                                className={`${chipBase} ${toneClass(
                                                    postsTone(report.siteStructure?.postCount)
                                                )}`}
                                            >
                                                {report.siteStructure?.postCount ?? 0}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Meta Tags */}
                                    <div className="flex items-center gap-2">
                                        <Tag className="text-gray-500" size={16} />
                                        <div className="text-xs">
                                            <div className="font-medium">Meta Tags</div>
                                            <span
                                                className={`${chipBase} ${report.siteStructure?.hasMetaTags
                                                    ? toneClass("green")
                                                    : toneClass("red")
                                                    }`}
                                            >
                                                {report.siteStructure?.hasMetaTags ? "Present" : "Missing"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Header Tags */}
                                    <div className="flex items-center gap-2">
                                        <Heading className="text-gray-500" size={16} />
                                        <div className="text-xs">
                                            <div className="font-medium">Headers</div>
                                            <span
                                                className={`${chipBase} ${report.siteStructure?.hasGoodHeaders
                                                    ? toneClass("green")
                                                    : toneClass("amber")
                                                    }`}
                                            >
                                                {report.siteStructure?.hasGoodHeaders ? "Good" : "Weak"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Structure Score */}
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="text-gray-500" size={16} />
                                        <div className="text-xs">
                                            <div className="font-medium">Structure</div>
                                            <span
                                                className={`${chipBase} ${toneClass(
                                                    structureTone(structureScore)
                                                )}`}
                                            >
                                                {structureScore}/100
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {report.siteStructure?.structureWarnings?.length ? (
                                    <div className="mt-3 rounded-lg bg-amber-50 border border-amber-100 p-2">
                                        <div className="text-xs font-medium text-amber-800 flex items-center gap-1">
                                            <AlertTriangle size={14} /> Warnings
                                        </div>
                                        <ul className="list-disc list-inside mt-1 text-xs text-amber-700 space-y-0.5">
                                            {report.siteStructure.structureWarnings.map((w, i) => (
                                                <li key={i}>{w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : null}
                            </div>

                            {/* Required Legal Pages */}
                            <div>
                                <h4 className="text-sm font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <FileText size={16} className="text-gray-600" />
                                    Required Legal Pages
                                </h4>
                                <div className="flex flex-wrap gap-2">
                                    {["about", "contact", "privacy", "terms", "disclaimer"].map((page) => {
                                        const found = (report.requiredPages?.found || []).includes(page);
                                        return (
                                            <span
                                                key={page}
                                                className={`${chipBase} ${found ? toneClass("green") : toneClass("red")
                                                    }`}
                                            >
                                                {found ? `✅ ${page}` : `❌ ${page}`}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Policy Violations */}
                            <div>
                                <details className="group rounded-lg border border-gray-200">
                                    <summary className="flex items-center justify-between gap-2 cursor-pointer list-none px-4 py-3">
                                        <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                            <AlertCircle size={16} className="text-red-500" />
                                            Policy Violations
                                        </span>
                                        <span className="ml-auto text-xs font-medium bg-red-50 text-red-700 px-2 py-0.5 rounded-full">
                                            {report.pagesWithViolations?.length ?? 0}
                                        </span>
                                        <span className="transition-transform group-open:rotate-180 text-gray-500">
                                            ▾
                                        </span>
                                    </summary>

                                    {report.pagesWithViolations?.length ? (
                                        <div className="px-4 pb-4">
                                            <div className="space-y-3 text-xs max-h-56 overflow-y-auto pr-1">
                                                {report.pagesWithViolations.map((p, i) => {
                                                    const violations = (p.violations || [])
                                                        .map(formatViolation)
                                                        .filter(Boolean);

                                                    return (
                                                        <div
                                                            key={i}
                                                            className="rounded-lg border border-red-100 bg-red-50 p-3"
                                                        >
                                                            <a
                                                                href={p.url}
                                                                target="_blank"
                                                                rel="noreferrer"
                                                                className="text-red-700 hover:underline break-all font-medium"
                                                            >
                                                                {new URL(p.url).pathname}
                                                            </a>

                                                            {violations.length ? (
                                                                <div className="mt-2 flex flex-wrap gap-1">
                                                                    {violations.map((v, idx) => (
                                                                        <span
                                                                            key={idx}
                                                                            className="text-xs px-2 py-1 rounded-md bg-white border border-gray-200 text-gray-700"
                                                                        >
                                                                            {v}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : null}

                                                            {p.summary ? (
                                                                <div className="mt-2 rounded-md bg-white border border-gray-200 text-gray-700 p-2">
                                                                    {p.summary}
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="px-4 pb-4">
                                            <p className="text-green-700 text-xs flex items-center gap-1">
                                                <CheckCircle size={14} /> No policy violations found.
                                            </p>
                                        </div>
                                    )}
                                </details>
                            </div>

                            {/* AI Suggestions */}
                            {safeSuggestions.length ? (
                                <div>
                                    <details className="group rounded-lg border border-gray-200">
                                        <summary className="flex items-center justify-between gap-2 cursor-pointer list-none px-4 py-3">
                                            <span className="text-sm font-semibold text-gray-900 flex items-center gap-2">
                                                <Brain size={16} className="text-indigo-500" />
                                                AI Suggestions
                                            </span>
                                            <span className="ml-auto text-xs font-medium bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
                                                {safeSuggestions.length}
                                            </span>
                                            <span className="transition-transform group-open:rotate-180 text-gray-500">
                                                ▾
                                            </span>
                                        </summary>
                                        <div className="px-4 pb-4">
                                            <ul className="list-disc list-inside text-gray-700 text-xs space-y-1">
                                                {safeSuggestions.map((s, i) => (
                                                    <li key={i}>{s}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    </details>
                                </div>
                            ) : null}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={onClose}
                                className="px-4 py-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition"
                            >
                                Close
                            </button>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
}
