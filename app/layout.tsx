// app/layout.tsx
"use client";

import "./globals.css";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function RootLayout({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Ensure hydration before reading cookies/localStorage
  useEffect(() => setHydrated(true), []);

  useEffect(() => {
    if (!hydrated) return;
    const cookies = document.cookie || "";
    const isLogged = cookies.includes("isLoggedIn=true");
    setLoggedIn(isLogged);

    // Redirect to login if not logged in
    if (!isLogged && pathname !== "/login") {
      router.replace("/login");
    }
  }, [hydrated, pathname, router]);

  // 🕐 Avoid hydration mismatch
  if (!hydrated) {
    return (
      <html lang="en">
        <body className="min-h-screen flex items-center justify-center text-gray-500">
          <p>Loading...</p>
        </body>
      </html>
    );
  }

  // 🔐 Show login layout (no sidebar)
  if (pathname === "/login") {
    return (
      <html lang="en">
        <body className="min-h-screen bg-gray-50">{children}</body>
      </html>
    );
  }

  // ✅ Dashboard layout (with sidebar)
  return (
    <html lang="en">
      <body className="min-h-screen flex bg-gray-50 text-gray-900 font-sans antialiased">
        {/* Sidebar */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
          <div className="px-6 pt-8 pb-6">
            <h1 className="text-xl font-semibold text-gray-900">PolicyGuard</h1>
            <p className="text-xs text-gray-500 mt-1">Compliance Dashboard</p>
          </div>

          <nav className="flex-1 px-4 py-2">
            <div className="space-y-1">
              <NavItem href="/">Overview</NavItem>
              <NavItem href="/sites">Sites</NavItem>
              <NavItem href="/violations">Violations</NavItem>
              <NavItem href="/grant-access">Grant Access</NavItem>
              <NavItem href="/settings">Settings</NavItem>
            </div>
          </nav>

          <div className="px-6 py-4 border-t border-gray-100">
            <div className="text-xs text-gray-500 mb-2">
              Logged in as:{" "}
              {typeof window !== "undefined" ? localStorage.getItem("userEmail") : ""}
            </div>
            <button
              onClick={() => {
                document.cookie =
                  "isLoggedIn=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                document.cookie =
                  "userEmail=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                localStorage.removeItem("isLoggedIn");
                localStorage.removeItem("userEmail");
                window.location.href = "/login";
              }}
              className="text-xs text-red-500 hover:text-red-700 font-medium"
            >
              Sign Out
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </body>
    </html>
  );
}

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