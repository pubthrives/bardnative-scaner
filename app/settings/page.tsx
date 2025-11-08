// app/settings/page.tsx
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import toast, { Toaster } from "react-hot-toast";
import { Trash2, Settings } from "lucide-react";

export default function SettingsPage() {
    const [clearing, setClearing] = useState(false);

    const clearData = () => {
        if (!confirm("⚠️ Clear all saved scan data? This cannot be undone.")) return;

        setClearing(true);
        setTimeout(() => {
            localStorage.clear();
            toast.success("All data cleared successfully!");
            setClearing(false);
        }, 800);
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Toaster position="top-right" />
            <div className="max-w-3xl mx-auto px-6 py-12">
                {/* Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-center mb-12"
                >
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gray-100 mb-4">
                        <Settings className="text-gray-600" size={24} />
                    </div>
                    <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>
                    <p className="text-gray-500 mt-2">Manage your dashboard preferences</p>
                </motion.div>

                {/* Settings Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="bg-white rounded-2xl border border-gray-200 p-8 max-w-md mx-auto"
                >
                    <div className="text-center mb-6">
                        <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-4">
                            <Trash2 className="text-red-600" size={20} />
                        </div>
                        <h2 className="text-lg font-semibold text-gray-900 mb-2">
                            Clear Data
                        </h2>
                        <p className="text-sm text-gray-600">
                            Remove all saved scan results and reports from this device
                        </p>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.98 }}
                        onClick={clearData}
                        disabled={clearing}
                        className={`w-full py-3 rounded-lg font-medium transition ${clearing
                            ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                            : "bg-red-50 text-red-600 hover:bg-red-100"
                            }`}
                    >
                        {clearing ? (
                            <span className="flex items-center justify-center gap-2">
                                <div className="w-4 h-4 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"></div>
                                Clearing Data...
                            </span>
                        ) : (
                            "Clear All Data"
                        )}
                    </motion.button>

                    <div className="mt-4 text-center">
                        <p className="text-xs text-gray-500">
                            This will remove all locally stored scan results
                        </p>
                    </div>
                </motion.div>

                {/* Info Section */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="mt-8 text-center"
                >
                    <p className="text-sm text-gray-500">
                        PolicyGuard v1.0 · AI-Powered Compliance Scanner
                    </p>
                </motion.div>
            </div>
        </div>
    );
}
