"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

  business: {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    email: string | null;
    logo: string | null;

    currency: string;
    receiptFooter: string;
    showLogo: boolean;
    showPhone: boolean;
    showEmail: boolean;
    showAddress: boolean;
  };

  customer: {
    id: string;
    name: string;
  } | null;

  items: SaleItem[];
};

export default function SaleDetailsPage() {
  const params = useParams();
  const router = useRouter();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSale = async () => {
      try {
        const response = await fetch(`/api/sales/${params.id}`);

        if (!response.ok) {
          throw new Error("Failed to load sale");
        }

        const data = await response.json();
        setSale(data);
      } catch (error) {
        console.error("Failed to load sale:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchSale();
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8">
          <div className="py-12 text-center text-gray-500">
            Loading sale details...
          </div>
        </main>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8">
          <div className="rounded-xl bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-bold text-gray-900">
              Sale Not Found
            </h1>

            <button
              type="button"
              onClick={() => router.push("/sales")}
              className="mt-4 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700"
            >
              Back to Sales
            </button>
          </div>
        </main>
      </div>
    );
  }

  const currency = sale.business.currency || "Rs.";

  const receiptFooter =
    sale.business.receiptFooter || "Thank You!";

  const paymentMethodName = (() => {
    switch (sale.paymentMethod) {
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
        return sale.paymentMethod;
    }
  })();

  const paymentStatus =
    sale.paidAmount >= sale.total
      ? "PAID"
      : sale.paidAmount > 0
      ? "PARTIAL"
      : "DUE";

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      {/* Sidebar */}
      <div className="no-print">
        <Sidebar />
      </div>

      <main className="flex-1 p-4 md:p-8">
        {/* Page Actions */}
        <div className="no-print mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Sale Details
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Complete information about this sale.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Print Receipt
            </button>

            <button
              type="button"
              onClick={() => router.push("/sales")}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Back to Sales
            </button>
          </div>
        </div>

        {/* Receipt */}
        <div className="print-receipt mx-auto overflow-hidden rounded-xl bg-white shadow-sm">
          {/* Business Header */}
          <div className="border-b px-6 py-6 text-center">
            {/* Logo */}
            {sale.business.showLogo &&
              sale.business.logo && (
                <img
                  src={sale.business.logo}
                  alt={sale.business.name}
                  className="mx-auto mb-3 h-16 w-auto object-contain"
                />
              )}

            {/* Business Name */}
            <h2 className="text-2xl font-bold text-gray-900">
              {sale.business.name}
            </h2>

            {/* Address */}
            {sale.business.showAddress &&
              sale.business.address && (
                <p className="mt-2 text-sm text-gray-600">
                  {sale.business.address}
                </p>
              )}

            {/* Phone */}
            {sale.business.showPhone &&
              sale.business.phone && (
                <p className="text-sm text-gray-600">
                  Phone: {sale.business.phone}
                </p>
              )}

            {/* Email */}
            {sale.business.showEmail &&
              sale.business.email && (
                <p className="text-sm text-gray-600">
                  {sale.business.email}
                </p>
              )}

            <div className="mt-4 border-t pt-4">
              <h3 className="text-lg font-bold tracking-wide text-gray-900">
                SALE RECEIPT
              </h3>
            </div>
          </div>

          {/* Sale Information */}
          <div className="border-b px-6 py-4 text-sm">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">
                Sale ID
              </span>

              <span className="break-all font-mono text-right text-gray-900">
                {sale.id}
              </span>
            </div>

            <div className="mt-2 flex justify-between gap-4">
              <span className="text-gray-500">
                Date
              </span>

              <span className="text-right text-gray-900">
                {new Date(
                  sale.createdAt
                ).toLocaleString()}
              </span>
            </div>

            <div className="mt-2 flex justify-between gap-4">
              <span className="text-gray-500">
                Customer
              </span>

              <span className="text-right text-gray-900">
                {sale.customer?.name ||
                  "Walk-in Customer"}
              </span>
            </div>
          </div>

          {/* Products */}
          <div className="px-6 py-5">
            <div className="mb-3 grid grid-cols-[1fr_auto_auto] gap-3 border-b pb-2 text-xs font-bold uppercase text-gray-500">
              <span>Product</span>

              <span className="text-center">
                Qty
              </span>

              <span className="text-right">
                Amount
              </span>
            </div>

            <div className="space-y-3">
              {sale.items.map((item) => (
                <div
                  key={item.id}
                  className="grid grid-cols-[1fr_auto_auto] gap-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900">
                      {item.product.name}
                    </p>

                    <p className="text-xs text-gray-500">
                      {currency} {item.price} ×{" "}
                      {item.quantity}
                    </p>
                  </div>

                  <span className="text-center text-gray-700">
                    {item.quantity}
                  </span>

                  <span className="text-right font-medium text-gray-900">
                    {currency} {item.total}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t bg-gray-50 px-6 py-5">
            <div className="space-y-2 text-sm">
              {/* Subtotal */}
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Subtotal
                </span>

                <span className="text-gray-900">
                  {currency} {sale.subtotal}
                </span>
              </div>

              {/* Discount */}
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Discount
                </span>

                <span className="text-gray-900">
                  {currency} {sale.discount}
                </span>
              </div>

              {/* Grand Total */}
              <div className="mt-3 flex justify-between border-t pt-3 text-lg font-bold">
                <span className="text-gray-900">
                  Grand Total
                </span>

                <span className="text-gray-900">
                  {currency} {sale.total}
                </span>
              </div>

              {/* Payment Method */}
              <div className="mt-4 flex justify-between border-t pt-3">
                <span className="text-gray-600">
                  Payment Method
                </span>

                <span className="font-semibold text-gray-900">
                  {paymentMethodName}
                </span>
              </div>

              {/* Paid Amount */}
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Paid Amount
                </span>

                <span className="font-semibold text-green-600">
                  {currency} {sale.paidAmount}
                </span>
              </div>

              {/* Due Amount */}
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">
                  Due Amount
                </span>

                <span className="font-bold text-red-600">
                  {currency} {sale.dueAmount}
                </span>
              </div>

              {/* Status */}
              <div className="flex justify-between">
                <span className="text-gray-600">
                  Payment Status
                </span>

                <span
                  className={`font-bold ${
                    paymentStatus === "PAID"
                      ? "text-green-600"
                      : paymentStatus === "PARTIAL"
                      ? "text-orange-600"
                      : "text-red-600"
                  }`}
                >
                  {paymentStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Payment Details */}
          {(sale.bankName ||
            sale.transactionReference ||
            sale.cardType ||
            sale.cardLast4 ||
            sale.mobileNumber) && (
            <div className="border-t px-6 py-5">
              <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">
                Payment Details
              </h4>

              <div className="space-y-2 text-sm">
                {/* Bank */}
                {sale.bankName && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      Bank
                    </span>

                    <span className="text-right font-medium text-gray-900">
                      {sale.bankName}
                    </span>
                  </div>
                )}

                {/* Card Type */}
                {sale.cardType && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      Card Type
                    </span>

                    <span className="text-right font-medium text-gray-900">
                      {sale.cardType === "DEBIT"
                        ? "Debit Card"
                        : sale.cardType === "CREDIT"
                        ? "Credit Card"
                        : sale.cardType}
                    </span>
                  </div>
                )}

                {/* Card Last 4 */}
                {sale.cardLast4 && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      Card
                    </span>

                    <span className="text-right font-medium text-gray-900">
                      **** {sale.cardLast4}
                    </span>
                  </div>
                )}

                {/* Mobile Number */}
                {sale.mobileNumber && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      Mobile
                    </span>

                    <span className="text-right font-medium text-gray-900">
                      {sale.mobileNumber}
                    </span>
                  </div>
                )}

                {/* Reference */}
                {sale.transactionReference && (
                  <div className="flex justify-between gap-4">
                    <span className="text-gray-500">
                      Reference
                    </span>

                    <span className="break-all text-right font-medium text-gray-900">
                      {sale.transactionReference}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="border-t px-6 py-5 text-center">
            <p className="text-sm font-medium text-gray-700">
              {receiptFooter}
            </p>

            <p className="mt-1 text-xs text-gray-500">
              Please visit us again.
            </p>

            <p className="mt-4 text-xs text-gray-800">
              Powered by HAK MRS Solution
            </p>
          </div>
        </div>
      </main>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
          }

          .no-print {
            display: none !important;
          }

          button,
          aside,
          nav {
            display: none !important;
          }

          main {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          .print-receipt {
            width: 80mm !important;
            max-width: 80mm !important;
            margin: 0 auto !important;
            box-shadow: none !important;
            border: none !important;
            border-radius: 0 !important;
          }
        }
      `}</style>
    </div>
  );
}