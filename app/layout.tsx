// app/layout.tsx
import "./globals.css";
import Link from "next/link";
import { ReactNode } from "react";

export const metadata = {
  title: "PolicyGuard",
  description: "AI-powered AdSense & Policy Compliance Dashboard",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex bg-gray-50 text-gray-900 font-sans antialiased">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          {/* Logo Area */}
          <div className="px-6 pt-8 pb-6">
            <h1 className="text-xl font-semibold text-gray-900">PolicyGuard</h1>
            <p className="text-xs text-gray-500 mt-1">Compliance Dashboard</p>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-2">
            <div className="space-y-1">
              <NavItem href="/">Overview</NavItem>
              <NavItem href="/sites">Sites</NavItem>
              <NavItem href="/violations">Violations</NavItem>
              <NavItem href="/settings">Settings</NavItem>
            </div>
          </nav>

          {/* Bottom Info */}
          <div className="px-6 py-4 border-t border-gray-100">
            <div className="text-xs text-gray-500">
              <div>AI-Powered Scanner</div>
              <div className="mt-1">v1.0</div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}

// Reusable NavItem Component
function NavItem({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="block px-4 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900 transition-colors duration-150"
    >
      {children}
    </Link>
  );
}
