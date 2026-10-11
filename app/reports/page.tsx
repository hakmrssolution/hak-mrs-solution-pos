
"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Summary = {
  totalSales: number;
  totalPurchases: number;
  totalExpenses: number;

  costOfGoodsSold: number;
  grossProfit: number;
  netProfit: number;

  totalStockValue: number;
  totalRetailValue: number;
  potentialStockMargin: number;

  totalItemsSold: number;
  totalItemsPurchased: number;
  totalProducts: number;
};

type ReportData = {
  summary: Summary;
};

type FilterType =
  | "all"
  | "today"
  | "week"
  | "month"
  | "custom";

export default function ReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<FilterType>("all");

  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const getDateString = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
  };

  const getDateRange = (selectedFilter: FilterType) => {
    const today = new Date();

    if (selectedFilter === "today") {
      const date = getDateString(today);

      return {
        from: date,
        to: date,
      };
    }

    if (selectedFilter === "week") {
      const start = new Date(today);
      const day = start.getDay();

      const difference = day === 0 ? 6 : day - 1;

      start.setDate(start.getDate() - difference);

      return {
        from: getDateString(start),
        to: getDateString(today),
      };
    }

    if (selectedFilter === "month") {
      const start = new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

      return {
        from: getDateString(start),
        to: getDateString(today),
      };
    }

    if (selectedFilter === "custom") {
      if (!customFrom || !customTo) {
        return null;
      }

      return {
        from: customFrom,
        to: customTo,
      };
    }

    return null;
  };

  const fetchReports = async (
    selectedFilter: FilterType = filter
  ) => {
    try {
      setLoading(true);

      const range = getDateRange(selectedFilter);

      if (selectedFilter === "custom" && !range) {
        alert("Please select both start and end dates.");
        setLoading(false);
        return;
      }

      if (
        range &&
        new Date(`${range.from}T00:00:00`) >
          new Date(`${range.to}T00:00:00`)
      ) {
        alert("Start date cannot be after end date.");
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();

      if (range) {
        params.set("from", range.from);
        params.set("to", range.to);
      }

      const query = params.toString();

      const response = await fetch(
        query ? `/api/reports?${query}` : "/api/reports"
      );

      if (!response.ok) {
        throw new Error("Failed to load reports");
      }

      const result = await response.json();

      setData(result);
    } catch (error) {
      console.error(error);
      alert("Failed to load reports");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports("all");
  }, []);

  const handleFilterChange = (newFilter: FilterType) => {
    setFilter(newFilter);

    if (newFilter !== "custom") {
      fetchReports(newFilter);
    }
  };

  const handleCustomApply = () => {
    fetchReports("custom");
  };

  const clearFilter = () => {
    setFilter("all");
    setCustomFrom("");
    setCustomTo("");
    fetchReports("all");
  };

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8">
          <div className="text-sm text-gray-500">
            Loading reports...
          </div>
        </main>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8">
          <div className="rounded-xl bg-white p-6 text-red-600 shadow-sm">
            Failed to load reports.
          </div>
        </main>
      </div>
    );
  }

  const {
    totalSales,
    totalPurchases,
    totalExpenses,
    costOfGoodsSold,
    grossProfit,
    netProfit,
    totalStockValue,
    totalRetailValue,
    potentialStockMargin,
    totalItemsSold,
    totalItemsPurchased,
    totalProducts,
  } = data.summary;

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Reports
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Business performance overview
            </p>
          </div>

          {/* Date Filters */}
          <div className="mb-6 rounded-xl bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Report Period
              </h2>

              <p className="mt-1 text-sm text-gray-500">
                Select the period you want to analyze.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => handleFilterChange("all")}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
                  filter === "all"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All Time
              </button>

              <button
                type="button"
                onClick={() => handleFilterChange("today")}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
                  filter === "today"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Today
              </button>

              <button
                type="button"
                onClick={() => handleFilterChange("week")}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
                  filter === "week"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                This Week
              </button>

              <button
                type="button"
                onClick={() => handleFilterChange("month")}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
                  filter === "month"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                This Month
              </button>

              <button
                type="button"
                onClick={() => setFilter("custom")}
                className={`rounded-lg px-4 py-2.5 text-sm font-medium ${
                  filter === "custom"
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Custom Range
              </button>
            </div>

            {filter === "custom" && (
              <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    From
                  </label>

                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) =>
                      setCustomFrom(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex-1">
                  <label className="mb-1 block text-sm font-medium text-gray-700">
                    To
                  </label>

                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) =>
                      setCustomTo(e.target.value)
                    }
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleCustomApply}
                  className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Apply
                </button>
              </div>
            )}

            {filter !== "all" && (
              <button
                type="button"
                onClick={clearFilter}
                className="mt-4 text-sm font-medium text-gray-500 hover:text-gray-900"
              >
                Clear Filter
              </button>
            )}
          </div>

          {/* Main Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Total Sales
              </p>

              <p className="mt-2 text-2xl font-bold text-green-600">
                Rs. {totalSales.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Total Purchases
              </p>

              <p className="mt-2 text-2xl font-bold text-blue-600">
                Rs. {totalPurchases.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Total Expenses
              </p>

              <p className="mt-2 text-2xl font-bold text-red-600">
                Rs. {totalExpenses.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Net Profit
              </p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  netProfit >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                Rs. {netProfit.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Profit Details */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Cost of Goods Sold
              </p>

              <p className="mt-2 text-2xl font-bold text-orange-600">
                Rs. {costOfGoodsSold.toFixed(2)}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Cost of products sold during this period
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Gross Profit
              </p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  grossProfit >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                Rs. {grossProfit.toFixed(2)}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Sales minus cost of goods sold
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Net Profit
              </p>

              <p
                className={`mt-2 text-2xl font-bold ${
                  netProfit >= 0
                    ? "text-green-600"
                    : "text-red-600"
                }`}
              >
                Rs. {netProfit.toFixed(2)}
              </p>

              <p className="mt-1 text-xs text-gray-400">
                Gross profit minus expenses
              </p>
            </div>
          </div>

          {/* Stock Stats */}
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Products
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                {totalProducts}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Stock Cost Value
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                Rs. {totalStockValue.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Stock Retail Value
              </p>

              <p className="mt-2 text-2xl font-bold text-gray-900">
                Rs. {totalRetailValue.toFixed(2)}
              </p>
            </div>

            <div className="rounded-xl bg-white p-5 shadow-sm">
              <p className="text-sm text-gray-500">
                Potential Stock Margin
              </p>

              <p className="mt-2 text-2xl font-bold text-green-600">
                Rs. {potentialStockMargin.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Activity */}
          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Sales Activity
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <span className="text-sm text-gray-600">
                    Items Sold
                  </span>

                  <span className="font-semibold text-gray-900">
                    {totalItemsSold}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Sales Revenue
                  </span>

                  <span className="font-semibold text-green-600">
                    Rs. {totalSales.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="rounded-xl bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Purchase Activity
              </h2>

              <div className="mt-5 space-y-4">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <span className="text-sm text-gray-600">
                    Items Purchased
                  </span>

                  <span className="font-semibold text-gray-900">
                    {totalItemsPurchased}
                  </span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">
                    Purchase Cost
                  </span>

                  <span className="font-semibold text-blue-600">
                    Rs. {totalPurchases.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Business Summary */}
          <div className="mt-6 rounded-xl bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">
              Business Summary
            </h2>

            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-3">
                <span className="text-gray-600">
                  Sales Revenue
                </span>

                <span className="font-medium">
                  Rs. {totalSales.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-3">
                <span className="text-gray-600">
                  Cost of Goods Sold
                </span>

                <span className="font-medium">
                  - Rs. {costOfGoodsSold.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-3">
                <span className="font-semibold text-gray-900">
                  Gross Profit
                </span>

                <span
                  className={`font-semibold ${
                    grossProfit >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  Rs. {grossProfit.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-wrap justify-between gap-2 border-b border-gray-100 pb-3">
                <span className="text-gray-600">
                  Expenses
                </span>

                <span className="font-medium">
                  - Rs. {totalExpenses.toFixed(2)}
                </span>
              </div>

              <div className="flex flex-wrap justify-between gap-2 pt-1">
                <span className="font-bold text-gray-900">
                  Net Profit
                </span>

                <span
                  className={`font-bold ${
                    netProfit >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  Rs. {netProfit.toFixed(2)}
                </span>
              </div>
            </div>

            <p className="mt-4 text-xs text-gray-400">
              Net profit is calculated from sales revenue minus
              the cost of goods sold and recorded business
              expenses.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
