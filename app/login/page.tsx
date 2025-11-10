// app/login/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail } from "lucide-react";
import toast, { Toaster } from "react-hot-toast";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    // Redirect away if already logged in
    useEffect(() => {
        const loggedIn = document.cookie.includes("isLoggedIn=true");
        if (loggedIn) router.replace("/");
    }, [router]);

    const validCredentials = [
        { email: "pubthrives@gmail.com", password: "mymanocat" },
        { email: "adops@bardnative.com", password: "Arman@12" },
        { email: "admin", password: "123" },
        { email: "adops@bardnative.com", password: "arman@12" },
    ];

    const normalize = (s: string) =>
        s.replace(/\u00A0/g, " ").trim().toLowerCase();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const found = validCredentials.find(
            (c) =>
                normalize(c.email) === normalize(email) &&
                c.password.trim() === password.trim()
        );

        if (found) {
            // set cookie + localStorage so both client/hydration + middleware can see it
            document.cookie = "isLoggedIn=true; path=/";
            document.cookie = `userEmail=${encodeURIComponent(found.email)}; path=/`;
            localStorage.setItem("isLoggedIn", "true");
            localStorage.setItem("userEmail", found.email);

            toast.success("Login successful!");
            // hard redirect to make layout re-check quickly
            setTimeout(() => {
                window.location.href = "/";
            }, 700);
        } else {
            toast.error("Invalid credentials");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-100 flex items-center justify-center p-6">
            <Toaster position="top-right" />
            <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white/90 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200 p-10 w-full max-w-xl"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Lock className="text-blue-600" size={26} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">PolicyGuard</h1>
                    <p className="text-gray-500 mt-2 text-sm">
                        AI-powered AdSense & Policy Compliance Dashboard
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Email Address
                        </label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                placeholder="you@example.com"
                                autoComplete="off"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition"
                                placeholder="••••••••"
                                autoComplete="new-password"
                                required
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className={`w-full py-3.5 rounded-lg font-semibold text-white shadow-md transition ${loading ? "bg-blue-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
                            }`}
                    >
                        {loading ? "Signing in..." : "Sign In"}
                    </button>
                </form>



            </motion.div >
        </div >
    );
}