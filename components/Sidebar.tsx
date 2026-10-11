"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const menuItems = [
  { name: "Dashboard", path: "/" },
  { name: "POS", path: "/pos" },
  { name: "Products", path: "/products" },
  { name: "Categories", path: "/categories" },
  { name: "Sales", path: "/sales" },
  { name: "Purchases", path: "/purchases" },
  { name: "Customers", path: "/customers" },
  { name: "Suppliers", path: "/suppliers" },
  { name: "Expenses", path: "/expenses" },
  { name: "Reports", path: "/reports" },
  { name: "Settings", path: "/settings" },
];

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleNavigation = (path: string) => {
    router.push(path);
    setMobileOpen(false);
  };

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      localStorage.removeItem("posUser");

      router.push("/login");
      router.refresh();
    } catch (error) {
      console.error("Logout Error:", error);
      setLoggingOut(false);
      alert("Logout failed. Please try again.");
    }
  };

  return (
    <>
      {/* Mobile Header */}
      <div className="flex items-center justify-between bg-slate-900 px-4 py-4 text-white md:hidden">
        <div>
          <h1 className="text-lg font-bold">HAK MRS POS</h1>

          <p className="text-xs text-slate-400">
            General Retail System
          </p>
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen(!mobileOpen)}
          className="rounded-lg p-2 text-2xl hover:bg-slate-800"
        >
          ☰
        </button>
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />

          <aside className="relative flex h-full w-72 flex-col bg-slate-900 text-white">
            <div className="flex items-center justify-between border-b border-slate-700 px-6 py-5">
              <div>
                <h1 className="text-xl font-bold">
                  HAK MRS POS
                </h1>

                <p className="mt-1 text-xs text-slate-400">
                  General Retail System
                </p>
              </div>

              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="text-xl text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto p-4">
              {menuItems.map((item) => {
                const active =
                  item.path === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.path);

                return (
                  <button
                    type="button"
                    key={item.name}
                    onClick={() => handleNavigation(item.path)}
                    className={`mb-1 w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                      active
                        ? "bg-blue-600 text-white"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >
                    {item.name}
                  </button>
                );
              })}
            </nav>

            {/* Mobile Bottom */}
            <div className="border-t border-slate-700">
              {/* Powered By */}
              <div className="px-4 py-3 text-center">
                <p className="text-xs text-slate-500">
                  Powered by{" "}
                  <a
                    href="https://hakmrssolution.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-semibold text-slate-300 hover:text-blue-400 hover:underline"
                  >
                    HAK MRS Solution
                  </a>
                </p>
              </div>

              {/* Mobile Logout */}
              <div className="border-t border-slate-700 p-4">
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full rounded-lg border border-red-500/40 px-4 py-3 text-left text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Desktop Sidebar */}
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col bg-slate-900 text-white md:flex">
        <div className="border-b border-slate-700 px-6 py-5">
          <h1 className="text-xl font-bold">HAK MRS POS</h1>

          <p className="mt-1 text-xs text-slate-400">
            General Retail System
          </p>
        </div>

        <nav className="flex-1 p-4">
          {menuItems.map((item) => {
            const active =
              item.path === "/"
                ? pathname === "/"
                : pathname.startsWith(item.path);

            return (
              <button
                type="button"
                key={item.name}
                onClick={() => handleNavigation(item.path)}
                className={`mb-1 w-full rounded-lg px-4 py-3 text-left text-sm transition ${
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                }`}
              >
                {item.name}
              </button>
            );
          })}
        </nav>

        {/* Desktop Bottom */}
        <div className="border-t border-slate-700">
          {/* Powered By */}
          <div className="px-4 py-3 text-center">
            <p className="text-xs text-slate-500">
              Powered by{" "}
              <a
                href="https://hakmrssolution.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-slate-300 hover:text-blue-400 hover:underline"
              >
                HAK MRS Solution
              </a>
            </p>
          </div>

          {/* Desktop Logout */}
          <div className="border-t border-slate-700 p-4">
            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="w-full rounded-lg border border-red-500/40 px-4 py-3 text-left text-sm font-medium text-red-400 transition hover:bg-red-500/10 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loggingOut ? "Logging out..." : "Logout"}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}