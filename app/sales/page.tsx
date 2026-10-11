"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type SaleItem = {
  id: string;
  quantity: number;
  price: number;
  total: number;
  product: {
    id: string;
    name: string;
  };
};

type Sale = {
  id: string;
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: string;
  paidAmount: number;
  dueAmount: number;
  bankName: string | null;
  transactionReference: string | null;
  cardType: string | null;
  cardLast4: string | null;
  mobileNumber: string | null;
  createdAt: string;

  items: SaleItem[];

  customer: {
    id: string;
    name: string;
  } | null;
};

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSales = async () => {
      try {
        const response = await fetch("/api/sales");

        if (!response.ok) {
          throw new Error("Failed to load sales");
        }

        const data = await response.json();

        setSales(data);
      } catch (error) {
        console.error("Failed to load sales:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSales();
  }, []);

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case "CASH":
        return "Cash";

      case "CARD":
        return "Card";

      case "BANK_TRANSFER":
        return "Bank Transfer";

      case "EASYPAISA":
        return "Easypaisa";

      case "JAZZCASH":
        return "JazzCash";

      default:
        return method;
    }
  };

  const getPaymentStatus = (sale: Sale) => {
    if (sale.paidAmount >= sale.total) {
      return "PAID";
    }

    if (sale.paidAmount > 0) {
      return "PARTIAL";
    }

    return "DUE";
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Sales
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            View and manage your completed sales.
          </p>
        </div>

        {/* Sales Card */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          {loading ? (
            <div className="py-12 text-center text-gray-400">
              Loading sales...
            </div>
          ) : sales.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              No sales found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Sale ID
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Date
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Customer
                    </th>

                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                      Items
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Subtotal
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Discount
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Total
                    </th>

                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                      Payment
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Paid
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Due
                    </th>

                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                      Status
                    </th>

                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
                      Action
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {sales.map((sale) => {
                    const paymentStatus =
                      getPaymentStatus(sale);

                    return (
                      <tr
                        key={sale.id}
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >
                        {/* Sale ID */}
                        <td className="px-6 py-4">
                          <span className="font-mono text-xs text-gray-600">
                            {sale.id}
                          </span>
                        </td>

                        {/* Date */}
                        <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                          {new Date(
                            sale.createdAt
                          ).toLocaleString()}
                        </td>

                        {/* Customer */}
                        <td className="px-6 py-4 text-sm text-gray-700">
                          {sale.customer?.name ||
                            "Walk-in Customer"}
                        </td>

                        {/* Items */}
                        <td className="px-6 py-4 text-center text-sm text-gray-700">
                          {sale.items.reduce(
                            (total, item) =>
                              total + item.quantity,
                            0
                          )}
                        </td>

                        {/* Subtotal */}
                        <td className="px-6 py-4 text-right text-sm text-gray-700">
                          Rs. {sale.subtotal}
                        </td>

                        {/* Discount */}
                        <td className="px-6 py-4 text-right text-sm text-gray-700">
                          Rs. {sale.discount}
                        </td>

                        {/* Total */}
                        <td className="px-6 py-4 text-right text-sm font-bold text-gray-900">
                          Rs. {sale.total}
                        </td>

                        {/* Payment Method */}
                        <td className="px-6 py-4 text-center">
                          <span className="inline-block rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-700">
                            {formatPaymentMethod(
                              sale.paymentMethod
                            )}
                          </span>
                        </td>

                        {/* Paid */}
                        <td className="px-6 py-4 text-right text-sm font-semibold text-green-600">
                          Rs. {sale.paidAmount}
                        </td>

                        {/* Due */}
                        <td className="px-6 py-4 text-right text-sm font-semibold text-red-600">
                          Rs. {sale.dueAmount}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${
                              paymentStatus === "PAID"
                                ? "bg-green-100 text-green-700"
                                : paymentStatus ===
                                  "PARTIAL"
                                ? "bg-orange-100 text-orange-700"
                                : "bg-red-100 text-red-700"
                            }`}
                          >
                            {paymentStatus}
                          </span>
                        </td>

                        {/* Action */}
                        <td className="px-6 py-4 text-center">
                          <a
                            href={`/sales/${sale.id}`}
                            className="inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                          >
                            View
                          </a>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}