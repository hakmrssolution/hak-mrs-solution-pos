
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";

type SaleData = {
  label: string;
  date: string;
  total: number;
};

type DashboardData = {
  todaySales: number;
  yesterdaySales: number;
  salesChange: number;
  totalProducts: number;
  customers: number;
  lowStock: number;
  salesData: SaleData[];
};

type SalesRange = "today" | "week" | "month" | "year";

export default function Home() {
  const router = useRouter();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [salesRange, setSalesRange] = useState<SalesRange>("week");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);

      try {
        const response = await fetch(
          `/api/dashboard?range=${salesRange}`
        );

        if (!response.ok) {
          throw new Error("Failed to load dashboard");
        }

        const dashboardData = await response.json();

        setData(dashboardData);
      } catch (error) {
        console.error("Dashboard Error:", error);
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, [salesRange]);

  const todaySales = data?.todaySales || 0;
  const salesChange = data?.salesChange || 0;

  const salesData = data?.salesData || [];

  const maxSale = Math.max(
    ...salesData.map((item) => item.total),
    1
  );

  const rangeTitle = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1">
        {/* Top Bar */}
        <header className="flex items-center justify-between border-b bg-white px-8 py-5">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              Dashboard
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Welcome to HAK MRS POS
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">
                Admin
              </p>

              <p className="text-xs text-slate-500">
                Administrator
              </p>
            </div>

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 font-bold text-white">
              A
            </div>
          </div>
        </header>

        {/* Dashboard Content */}
        <section className="p-8">
          {/* Stats */}
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {/* Today's Sales */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">
                Today&apos;s Sales
              </p>

              <h3 className="mt-2 text-3xl font-bold text-slate-900">
                {loading
                  ? "Loading..."
                  : `Rs. ${todaySales.toLocaleString()}`}
              </h3>

              <p
                className={`mt-2 text-xs ${
                  salesChange >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                {salesChange >= 0 ? "+" : ""}
                {salesChange}% from yesterday
              </p>
            </div>

            {/* Products */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">
                Total Products
              </p>

              <h3 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : data?.totalProducts || 0}
              </h3>

              <p className="mt-2 text-xs text-slate-500">
                Active products
              </p>
            </div>

            {/* Customers */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">
                Customers
              </p>

              <h3 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : data?.customers || 0}
              </h3>

              <p className="mt-2 text-xs text-slate-500">
                Registered customers
              </p>
            </div>

            {/* Low Stock */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <p className="text-sm text-slate-500">
                Low Stock
              </p>

              <h3 className="mt-2 text-3xl font-bold text-slate-900">
                {loading ? "..." : data?.lowStock || 0}
              </h3>

              <p className="mt-2 text-xs text-red-600">
                Products need attention
              </p>
            </div>
          </div>

          {/* Bottom Section */}
          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            {/* Sales Overview */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">
                    Sales Overview
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    {rangeTitle[salesRange]} sales performance
                  </p>
                </div>

                {/* Sales Range Dropdown */}
                <select
                  value={salesRange}
                  onChange={(event) =>
                    setSalesRange(
                      event.target.value as SalesRange
                    )
                  }
                  className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                >
                  <option value="today">Today</option>
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>

              {/* Sales Chart */}
              <div className="mt-6">
                {loading ? (
                  <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                    Loading sales...
                  </div>
                ) : salesData.length === 0 ? (
                  <div className="flex h-64 items-center justify-center text-sm text-slate-500">
                    No sales data available.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <div
                      className={`flex h-64 min-w-full items-end border-b border-l border-slate-200 px-3 ${
                        salesRange === "month"
                          ? "min-w-[900px] gap-2"
                          : salesRange === "year"
                          ? "min-w-[700px] gap-3"
                          : "gap-3"
                      }`}
                    >
                      {salesData.map((sale) => {
                        const height =
                          sale.total > 0
                            ? Math.max(
                                (sale.total / maxSale) * 100,
                                5
                              )
                            : 2;

                        return (
                          <div
                            key={sale.date}
                            className="flex h-full min-w-0 flex-1 flex-col justify-end"
                          >
                            <div
                              className="w-full rounded-t-md bg-blue-500 transition-all"
                              style={{
                                height: `${height}%`,
                              }}
                              title={`${sale.label}: Rs. ${sale.total.toLocaleString()}`}
                            />

                            <p className="mt-2 truncate text-center text-xs text-slate-500">
                              {sale.label}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-900">
                Quick Actions
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Common POS actions
              </p>

              <div className="mt-6 grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => router.push("/pos")}
                  className="rounded-lg bg-blue-600 p-4 text-sm font-medium text-white hover:bg-blue-700"
                >
                  New Sale
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/products")}
                  className="rounded-lg border p-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Add Product
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/customers")}
                  className="rounded-lg border p-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Add Customer
                </button>

                <button
                  type="button"
                  onClick={() => router.push("/reports")}
                  className="rounded-lg border p-4 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View Reports
                </button>
              </div>
            </div>
          </div>
        </section>
        <footer className="py-4 text-center text-sm text-gray-500">
  Powered by{" "}
  <a
    href="https://hakmrssolution.com"
    target="_blank"
    rel="noopener noreferrer"
    className="font-semibold text-blue-600 hover:underline"
  >
    HAK MRS Solution
  </a>
</footer>
      </main>
    </div>
  );
  
}
