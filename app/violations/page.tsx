// app/violations/page.tsx
"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    FileWarning,
    Trash2,
    Download,
    Eye,
    Globe,
    ShieldCheck,
    AlertCircle,
} from "lucide-react";
import SiteReportModal from "../components/SiteReportModal";

export default function ViolationsPage() {
    const [violations, setViolations] = useState<any[]>([]);
    const [selectedReport, setSelectedReport] = useState<any | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("guardian_violations");
        if (stored) setViolations(JSON.parse(stored));
    }, []);

    const handleDelete = (url: string) => {
        const updated = violations.filter((v) => v.url !== url);
        setViolations(updated);
        localStorage.setItem("guardian_violations", JSON.stringify(updated));
    };

    const handleDeleteAll = () => {
        if (confirm("Delete all saved reports?")) {
            setViolations([]);
            localStorage.removeItem("guardian_violations");
        }
    };

    const exportData = (type: "csv" | "json") => {
        if (!violations.length) return alert("No data to export!");
        if (type === "json") {
            const blob = new Blob([JSON.stringify(violations, null, 2)], {
                type: "application/json",
            });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "violations.json";
            a.click();
        } else {
            const headers = Object.keys(violations[0]).join(",");
            const rows = violations.map((v) =>
                Object.values(v)
                    .map((val) => `"${String(val).replace(/"/g, '""')}"`)
                    .join(",")
            );
            const csv = [headers, ...rows].join("\n");
            const blob = new Blob([csv], { type: "text/csv" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "violations.csv";
            a.click();
        }
    };

    const openModal = (report: any) => {
        setSelectedReport(report);
        setIsModalOpen(true);
    };

    const closeModal = () => setIsModalOpen(false);

    return (
        <div className="min-h-screen bg-gray-50 text-gray-900">
            <div className="max-w-7xl mx-auto px-6 py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-10"
                >
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                                <ShieldCheck className="text-blue-600" size={20} />
                            </div>
                            <h1 className="text-2xl font-semibold text-gray-900">Policy Reports</h1>
                        </div>
                        <p className="text-gray-500 text-sm">
                            Review compliance and content reports across all scanned websites
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => exportData("csv")}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition flex items-center gap-2"
                        >
                            <Download size={14} /> CSV
                        </button>
                        <button
                            onClick={() => exportData("json")}
                            className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition flex items-center gap-2"
                        >
                            <Download size={14} /> JSON
                        </button>
                        <button
                            onClick={handleDeleteAll}
                            className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm hover:bg-red-100 transition flex items-center gap-2"
                        >
                            <Trash2 size={14} /> Clear All
                        </button>
                    </div>
                </motion.div>

                {/* Table */}
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden"
                >
                    <table className="min-w-full text-sm text-left text-gray-700">
                        <thead className="bg-gray-50 border-b border-gray-200 text-gray-800 font-medium">
                            <tr>
                                <th className="px-6 py-3 w-12 text-center">#</th>
                                <th className="px-6 py-3">Website</th>
                                <th className="px-6 py-3 text-center">Status</th>
                                <th className="px-6 py-3 text-center">Score</th>
                                <th className="px-6 py-3 text-center">Scanned</th>
                                <th className="px-6 py-3 text-center w-32">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            <AnimatePresence>
                                {violations.length === 0 ? (
                                    <motion.tr
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="text-center"
                                    >
                                        <td colSpan={6} className="py-16 text-gray-400">
                                            <Globe className="mx-auto mb-3" size={32} />
                                            <p className="text-sm">No scans yet. Run your first check from the Sites page.</p>
                                        </td>
                                    </motion.tr>
                                ) : (
                                    violations.map((v, i) => (
                                        <motion.tr
                                            key={i}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.03 }}
                                            className="border-b border-gray-100 hover:bg-gray-50 transition"
                                        >
                                            <td className="px-6 py-4 text-center text-gray-500">
                                                {i + 1}
                                            </td>
                                            <td className="px-6 py-4">
                                                <a
                                                    href={v.url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {new URL(v.url).hostname}
                                                </a>
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                {v.requiredPages?.missing?.length > 0 ? (
                                                    <span className="px-2.5 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
                                                        Missing Pages
                                                    </span>
                                                ) : v.totalViolations > 0 ? (
                                                    <span className="px-2.5 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                                                        Policy Issues
                                                    </span>
                                                ) : (
                                                    <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                                                        Clean
                                                    </span>
                                                )}
                                            </td>
                                            <td
                                                className={`px-6 py-4 text-center font-semibold text-sm ${v.score >= 80
                                                    ? "text-green-600"
                                                    : v.score >= 60
                                                        ? "text-yellow-600"
                                                        : "text-red-600"
                                                    }`}
                                            >
                                                {v.score}/100
                                            </td>
                                            <td className="px-6 py-4 text-center text-gray-500 text-xs">
                                                {new Date(v.scannedAt).toLocaleDateString([], {
                                                    month: "short",
                                                    day: "numeric",
                                                })}
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <div className="flex justify-center gap-2">
                                                    <button
                                                        onClick={() => openModal(v)}
                                                        className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-md transition"
                                                        title="View Details"
                                                    >
                                                        <Eye size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDelete(v.url)}
                                                        className="p-1.5 text-gray-600 hover:bg-red-50 hover:text-red-600 rounded-md transition"
                                                        title="Delete"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </motion.tr>
                                    ))
                                )}
                            </AnimatePresence>
                        </tbody>
                    </table>
                </motion.div>
            </div>

            {/* Modal */}
            <SiteReportModal
                isOpen={isModalOpen}
                onClose={closeModal}
                report={selectedReport}
            />
        </div>
    );
}
