"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Mail, Loader2 } from "lucide-react";

export default function GrantAccessPage() {
    const [email, setEmail] = useState("");
    const [networks, setNetworks] = useState<any[]>([]);
    const [selectedNetwork, setSelectedNetwork] = useState("");
    const [loadingNetworks, setLoadingNetworks] = useState(true);
    const [loadingGrant, setLoadingGrant] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<{ text: string; type: string } | null>(
        null
    );

    // ✅ Fetch available networks directly from backend
    useEffect(() => {
        const fetchNetworks = async () => {
            try {
                const res = await fetch("https://gam-swift-api.onrender.com/networks", {
                    cache: "no-store",
                });
                if (!res.ok) throw new Error("Failed to fetch networks");
                const data = await res.json();
                setNetworks(data.networks || []);
            } catch (err: any) {
                console.error("Failed to load networks:", err.message);
                setError("Failed to load networks. Please try again later.");
            } finally {
                setLoadingNetworks(false);
            }
        };
        fetchNetworks();
    }, []);

    // ✅ Grant access request
    const handleGrantAccess = async () => {
        setMessage(null);
        setError(null);

        if (!email || !email.includes("@")) {
            setError("Please enter a valid email address.");
            return;
        }
        if (!selectedNetwork) {
            setError("Please select a network.");
            return;
        }

        setLoadingGrant(true);
        try {
            const res = await fetch("https://gam-swift-api.onrender.com/grant-access", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email,
                    networks: [selectedNetwork],
                }),
            });

            if (!res.ok) throw new Error("Failed to grant access");
            const data = await res.json();
            const result = data.results?.[0];

            if (!result) throw new Error("Invalid API response");

            if (result.status === "created") {
                setMessage({
                    text: `✅ Access granted: user created as Admin on network ${result.network}.`,
                    type: "success",
                });
            } else if (result.status === "upgraded") {
                setMessage({
                    text: `🔼 Access granted: existing user upgraded to Admin on network ${result.network}.`,
                    type: "success",
                });
            } else if (result.status === "already-admin") {
                setMessage({
                    text: `ℹ️ User is already an Admin on network ${result.network}.`,
                    type: "warning",
                });
            } else {
                setMessage({
                    text: `⚠️ Failed to grant access: ${result.error || "Unknown error"}.`,
                    type: "error",
                });
            }
        } catch (err: any) {
            console.error("Grant access failed:", err.message);
            setMessage({
                text: `❌ Failed to grant access: ${err.message}`,
                type: "error",
            });
        } finally {
            setLoadingGrant(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-3xl shadow-2xl border border-gray-200 p-10 w-full max-w-2xl"
            >
                <h1 className="text-2xl font-bold text-gray-900 mb-6 text-center">
                    Grant Google Ad Manager Access
                </h1>

                {/* Email Input */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        User Email
                    </label>
                    <div className="relative">
                        <Mail
                            className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
                            size={18}
                        />
                        <input
                            type="email"
                            placeholder="user@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                            autoComplete="off"
                        />
                    </div>
                </div>

                {/* Network Dropdown */}
                <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Network
                    </label>
                    {loadingNetworks ? (
                        <div className="flex items-center gap-2 text-gray-500">
                            <Loader2 className="w-4 h-4 animate-spin" /> Loading networks...
                        </div>
                    ) : error ? (
                        <p className="text-red-500 text-sm">{error}</p>
                    ) : (
                        <select
                            value={selectedNetwork}
                            onChange={(e) => setSelectedNetwork(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                        >
                            <option value="">Select a network...</option>
                            {networks.map((network) => (
                                <option key={network.networkCode} value={network.networkCode}>
                                    {network.networkCode} – {network.displayName}
                                </option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Grant Button */}
                <button
                    onClick={handleGrantAccess}
                    disabled={loadingGrant}
                    className={`w-full py-3.5 px-4 rounded-lg font-semibold text-white shadow-md transition-all ${loadingGrant
                        ? "bg-blue-400 cursor-not-allowed"
                        : "bg-blue-600 hover:bg-blue-700"
                        }`}
                >
                    {loadingGrant ? (
                        <span className="flex items-center justify-center gap-2">
                            <Loader2 className="w-4 h-4 animate-spin" /> Granting Access...
                        </span>
                    ) : (
                        "Grant Access"
                    )}
                </button>

                {/* Feedback */}
                {message && (
                    <div
                        className={`mt-6 p-4 rounded-lg text-sm ${message.type === "success"
                            ? "bg-green-50 text-green-700 border border-green-200"
                            : message.type === "warning"
                                ? "bg-yellow-50 text-yellow-700 border border-yellow-200"
                                : "bg-red-50 text-red-700 border border-red-200"
                            }`}
                    >
                        {message.text}
                    </div>
                )}
            </motion.div>
        </div>
    );
}