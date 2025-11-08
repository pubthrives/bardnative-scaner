// app/page.tsx
"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Globe,
  Shield,
  BarChart3,
  Clock,
  Server,
  AlertTriangle,
  TrendingUp,
  CheckCircle
} from "lucide-react";

export default function OverviewPage() {
  const [stats, setStats] = useState({
    totalSites: 0,
    lastScan: null as string | null,
    violationsFound: 0,
    systemStatus: "operational"
  });

  useEffect(() => {
    // Load stats from localStorage
    const stored = localStorage.getItem("guardian_violations");
    if (stored) {
      const violations = JSON.parse(stored);
      setStats({
        totalSites: violations.length,
        lastScan: violations.length > 0 ? violations[violations.length - 1].scannedAt : null,
        violationsFound: violations.reduce((sum: number, v: any) => sum + (v.totalViolations || 0), 0),
        systemStatus: "operational"
      });
    }
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-100 mb-6">
            <Shield className="text-blue-600" size={28} />
          </div>
          <h1 className="text-3xl font-semibold text-gray-900 mb-4">
            PolicyGuard Dashboard
          </h1>
          <p className="text-gray-500 max-w-2xl mx-auto">
            AI-powered AdSense compliance scanner. Monitor your websites and ensure policy adherence.
          </p>
        </motion.div>

        {/* Quick Actions - Main Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid md:grid-cols-2 gap-6 mb-12"
        >
          {/* Scan Sites Card */}
          <Link href="/sites">
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Globe className="text-blue-600" size={24} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">Scan Websites</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Add and scan websites for AdSense compliance, policy violations, and content quality.
              </p>
              <div className="flex items-center text-blue-600 font-medium">
                Get Started →
              </div>
            </motion.div>
          </Link>

          {/* View Violations Card */}
          <Link href="/violations">
            <motion.div
              whileHover={{ y: -4 }}
              className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm hover:shadow-md transition-all cursor-pointer"
            >
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="text-red-600" size={24} />
                </div>
                <h2 className="text-xl font-semibold text-gray-900">View Violations</h2>
              </div>
              <p className="text-gray-600 mb-6">
                Review all detected policy violations, compliance issues, and AI recommendations.
              </p>
              <div className="flex items-center text-red-600 font-medium">
                View Reports →
              </div>
            </motion.div>
          </Link>
        </motion.div>

        {/* Stats Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {/* System Status */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="text-green-600" size={20} />
              </div>
              <h3 className="font-medium text-gray-900">System Status</h3>
            </div>
            <p className="text-sm text-green-600 font-medium">Operational</p>
            <p className="text-xs text-gray-500 mt-1">All systems running</p>
          </div>

          {/* Total Sites */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Globe className="text-blue-600" size={20} />
              </div>
              <h3 className="font-medium text-gray-900">Total Sites</h3>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.totalSites}</p>
            <p className="text-xs text-gray-500 mt-1">Sites scanned</p>
          </div>

          {/* Violations Found */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="text-red-600" size={20} />
              </div>
              <h3 className="font-medium text-gray-900">Violations</h3>
            </div>
            <p className="text-2xl font-semibold text-gray-900">{stats.violationsFound}</p>
            <p className="text-xs text-gray-500 mt-1">Issues detected</p>
          </div>

          {/* Last Scan */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                <Clock className="text-purple-600" size={20} />
              </div>
              <h3 className="font-medium text-gray-900">Last Scan</h3>
            </div>
            <p className="text-sm text-gray-900 font-medium">
              {stats.lastScan
                ? new Date(stats.lastScan).toLocaleDateString()
                : "Never"}
            </p>
            <p className="text-xs text-gray-500 mt-1">Most recent scan</p>
          </div>
        </motion.div>

        {/* Quick Tips */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 bg-white rounded-2xl border border-gray-200 p-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h3>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mx-auto mb-3">
                <Globe className="text-blue-600" size={20} />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">1. Add Sites</h4>
              <p className="text-sm text-gray-600">Go to Sites to add websites for scanning</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-red-100 flex items-center justify-center mx-auto mb-3">
                <Shield className="text-red-600" size={20} />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">2. Run Scan</h4>
              <p className="text-sm text-gray-600">Our AI will check for policy violations</p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mx-auto mb-3">
                <TrendingUp className="text-green-600" size={20} />
              </div>
              <h4 className="font-medium text-gray-900 mb-2">3. Fix Issues</h4>
              <p className="text-sm text-gray-600">Follow AI suggestions to improve compliance</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
