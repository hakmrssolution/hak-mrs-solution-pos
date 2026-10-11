"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  stock: number;
};

type Customer = {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  balance: number;
};

type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");
  const [completingSale, setCompletingSale] = useState(false);

  // Payment
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [paidAmount, setPaidAmount] = useState("");

  const [bankName, setBankName] = useState("");
  const [transactionReference, setTransactionReference] = useState("");
  const [cardType, setCardType] = useState("");
  const [cardLast4, setCardLast4] = useState("");
  const [mobileNumber, setMobileNumber] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productsResponse, customersResponse] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/customers"),
        ]);

        if (!productsResponse.ok) {
          throw new Error("Failed to fetch products");
        }

        if (!customersResponse.ok) {
          throw new Error("Failed to fetch customers");
        }

        const productsData = await productsResponse.json();
        const customersData = await customersResponse.json();

        setProducts(productsData);
        setCustomers(customersData);
      } catch (error) {
        console.error("Failed to load POS data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);
const handleBarcodeScan = (barcode: string) => {
  const scannedBarcode = barcode.trim();

  if (!scannedBarcode) {
    return;
  }

  const product = products.find(
    (item) =>
      item.barcode &&
      item.barcode.trim() === scannedBarcode
  );

  if (!product) {
    alert("Product not found for this barcode.");
    setBarcodeInput("");
    return;
  }

  if (product.stock <= 0) {
    alert("This product is out of stock.");
    setBarcodeInput("");
    return;
  }

  setCart((currentCart) => {
    const existingProduct = currentCart.find(
      (item) => item.id === product.id
    );

    if (existingProduct) {
      if (existingProduct.quantity >= product.stock) {
        alert("Cannot add more than available stock.");
        return currentCart;
      }

      return currentCart.map((item) =>
        item.id === product.id
          ? {
              ...item,
              quantity: item.quantity + 1,
            }
          : item
      );
    }

    return [
      ...currentCart,
      {
        id: product.id,
        name: product.name,
        price: product.price,
        quantity: 1,
      },
    ];
  });

  setBarcodeInput("");
};
  const filteredProducts = products.filter((product) => {
    const searchTerm = search.toLowerCase().trim();

    return (
      product.name.toLowerCase().includes(searchTerm) ||
      (product.sku || "").toLowerCase().includes(searchTerm) ||
      (product.barcode || "").toLowerCase().includes(searchTerm)
    );
  });

  const subtotal = cart.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );

  const discount = 0;
  const total = subtotal - discount;

  const paid = Number(paidAmount) || 0;

  const remainingDue = Math.max(total - paid, 0);
  const change = Math.max(paid - total, 0);

  const paymentStatus =
    paid >= total ? "PAID" : paid > 0 ? "PARTIAL" : "DUE";

  const resetPaymentFields = () => {
    setPaymentMethod("CASH");
    setPaidAmount("");
    setBankName("");
    setTransactionReference("");
    setCardType("");
    setCardLast4("");
    setMobileNumber("");
  };

  const handlePaymentMethodChange = (method: string) => {
    setPaymentMethod(method);

    // Clear method-specific fields
    setBankName("");
    setTransactionReference("");
    setCardType("");
    setCardLast4("");
    setMobileNumber("");
  };

  const handleCompleteSale = async () => {
    if (cart.length === 0) {
      alert("Cart is empty.");
      return;
    }

    if (paid < 0) {
      alert("Paid amount cannot be negative.");
      return;
    }

    // Card validation
    if (paymentMethod === "CARD") {
      if (!cardType) {
        alert("Please select card type.");
        return;
      }

      if (!bankName.trim()) {
        alert("Please enter bank name.");
        return;
      }

      if (cardLast4 && !/^\d{4}$/.test(cardLast4)) {
        alert("Card last 4 digits must contain exactly 4 numbers.");
        return;
      }

      if (!transactionReference.trim()) {
        alert("Please enter transaction/reference number.");
        return;
      }
    }

    // Bank validation
    if (paymentMethod === "BANK_TRANSFER") {
      if (!bankName.trim()) {
        alert("Please enter bank name.");
        return;
      }

      if (!transactionReference.trim()) {
        alert("Please enter transaction/reference number.");
        return;
      }
    }

    // Easypaisa / JazzCash validation
    if (
      paymentMethod === "EASYPAISA" ||
      paymentMethod === "JAZZCASH"
    ) {
      if (!mobileNumber.trim()) {
        alert("Please enter mobile number.");
        return;
      }

      if (!transactionReference.trim()) {
        alert("Please enter transaction/reference number.");
        return;
      }
    }

    try {
      setCompletingSale(true);

      const response = await fetch("/api/sales", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.id,
            quantity: item.quantity,
          })),

          discount,

          customerId: selectedCustomerId || null,

          // Payment
          paymentMethod,
          paidAmount: paid,

          // Payment details
          bankName: bankName.trim() || null,
          transactionReference:
            transactionReference.trim() || null,
          cardType: cardType || null,
          cardLast4: cardLast4 || null,
          mobileNumber: mobileNumber.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(data.message || "Failed to complete sale.");
        return;
      }

      alert("Sale completed successfully!");

      setCart([]);
      setSelectedCustomerId("");
      resetPaymentFields();

      const productsResponse = await fetch("/api/products");

      if (productsResponse.ok) {
        const productsData = await productsResponse.json();
        setProducts(productsData);
      }
    } catch (error) {
      console.error("Complete Sale Error:", error);
      alert("Something went wrong while completing the sale.");
    } finally {
      setCompletingSale(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Point of Sale
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Create a new sale and manage your customer order.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Products */}
          <div className="rounded-xl bg-white p-6 shadow-sm lg:col-span-2">
            <h2 className="mb-4 text-lg font-semibold">
              Products
            </h2>
<div className="mb-3">
  <label className="mb-1 block text-sm font-medium text-gray-700">
    Scan Barcode
  </label>

  <input
    type="text"
    value={barcodeInput}
    onChange={(e) => setBarcodeInput(e.target.value)}
    onKeyDown={(e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        handleBarcodeScan(barcodeInput);
      }
    }}
    placeholder="Scan barcode and press Enter..."
    autoComplete="off"
    className="w-full rounded-lg border border-blue-300 bg-blue-50 p-3 outline-none focus:border-blue-500"
  />
</div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, SKU or barcode..."
              className="w-full rounded-lg border border-gray-300 p-3 outline-none focus:border-blue-500"
            />

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {loading ? (
                <div className="col-span-full py-10 text-center text-gray-400">
                  Loading products...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full py-10 text-center text-gray-400">
                  No products found.
                </div>
              ) : (
                filteredProducts.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => {
                      if (product.stock <= 0) {
                        return;
                      }

                      setCart((currentCart) => {
                        const existingProduct = currentCart.find(
                          (item) => item.id === product.id
                        );

                        if (existingProduct) {
                          if (
                            existingProduct.quantity >=
                            product.stock
                          ) {
                            return currentCart;
                          }

                          return currentCart.map((item) =>
                            item.id === product.id
                              ? {
                                  ...item,
                                  quantity: item.quantity + 1,
                                }
                              : item
                          );
                        }

                        return [
                          ...currentCart,
                          {
                            id: product.id,
                            name: product.name,
                            price: product.price,
                            quantity: 1,
                          },
                        ];
                      });
                    }}
                    disabled={product.stock <= 0}
                    className="rounded-lg border bg-white p-3 text-left transition hover:border-blue-500 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <h3 className="truncate text-sm font-semibold text-gray-900">
                      {product.name}
                    </h3>

                    <p className="mt-1 text-xs text-gray-500">
                      SKU: {product.sku || "N/A"}
                    </p>

                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-sm font-bold text-blue-600">
                        Rs. {product.price}
                      </span>

                      <span className="text-xs text-gray-500">
                        Stock: {product.stock}
                      </span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Cart */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-lg font-semibold">
              Current Cart
            </h2>

            <div className="space-y-3">
              {cart.length === 0 ? (
                <div className="flex min-h-40 items-center justify-center rounded-lg border-2 border-dashed border-gray-200 text-sm text-gray-400">
                  Cart is empty
                </div>
              ) : (
                cart.map((item) => {
                  const product = products.find(
                    (product) => product.id === item.id
                  );

                  const maxStock = product?.stock || 0;

                  return (
                    <div
                      key={item.id}
                      className="rounded-lg border bg-gray-50 p-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {item.name}
                          </h3>

                          <div className="mt-2 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setCart((currentCart) =>
                                  currentCart
                                    .map((cartItem) =>
                                      cartItem.id === item.id
                                        ? {
                                            ...cartItem,
                                            quantity:
                                              cartItem.quantity - 1,
                                          }
                                        : cartItem
                                    )
                                    .filter(
                                      (cartItem) =>
                                        cartItem.quantity > 0
                                    )
                                );
                              }}
                              className="flex h-7 w-7 items-center justify-center rounded bg-gray-200 text-sm font-bold hover:bg-gray-300"
                            >
                              −
                            </button>

                            <span className="min-w-6 text-center text-sm font-semibold">
                              {item.quantity}
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                if (item.quantity >= maxStock) {
                                  return;
                                }

                                setCart((currentCart) =>
                                  currentCart.map((cartItem) =>
                                    cartItem.id === item.id
                                      ? {
                                          ...cartItem,
                                          quantity:
                                            cartItem.quantity + 1,
                                        }
                                      : cartItem
                                  )
                                );
                              }}
                              disabled={item.quantity >= maxStock}
                              className="flex h-7 w-7 items-center justify-center rounded bg-gray-200 text-sm font-bold hover:bg-gray-300 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        <span className="text-sm font-bold">
                          Rs. {item.price * item.quantity}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Customer */}
            <div className="mb-4 mt-5">
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Customer
              </label>

              <select
                value={selectedCustomerId}
                onChange={(e) =>
                  setSelectedCustomerId(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">Walk-in Customer</option>

                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                    {customer.phone
                      ? ` - ${customer.phone}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Payment */}
            <div className="mt-6 border-t pt-5">
              <h3 className="mb-4 text-base font-semibold text-gray-900">
                Payment
              </h3>

              {/* Payment Method */}
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Payment Method
                </label>

                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    handlePaymentMethodChange(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card</option>
                  <option value="BANK_TRANSFER">
                    Bank Transfer
                  </option>
                  <option value="EASYPAISA">Easypaisa</option>
                  <option value="JAZZCASH">JazzCash</option>
                </select>
              </div>

              {/* Card Fields */}
              {paymentMethod === "CARD" && (
                <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-800">
                    Card Payment Details
                  </p>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Card Type
                    </label>

                    <select
                      value={cardType}
                      onChange={(e) =>
                        setCardType(e.target.value)
                      }
                      className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    >
                      <option value="">Select Card Type</option>
                      <option value="DEBIT">Debit Card</option>
                      <option value="CREDIT">Credit Card</option>
                    </select>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Bank Name
                    </label>

                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) =>
                        setBankName(e.target.value)
                      }
                      placeholder="e.g. HBL, UBL, Meezan Bank"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Card Last 4 Digits
                    </label>

                    <input
                      type="text"
                      inputMode="numeric"
                      maxLength={4}
                      value={cardLast4}
                      onChange={(e) =>
                        setCardLast4(
                          e.target.value.replace(/\D/g, "")
                        )
                      }
                      placeholder="1234"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Transaction / Reference No.
                    </label>

                    <input
                      type="text"
                      value={transactionReference}
                      onChange={(e) =>
                        setTransactionReference(e.target.value)
                      }
                      placeholder="Transaction reference"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Bank Transfer Fields */}
              {paymentMethod === "BANK_TRANSFER" && (
                <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-800">
                    Bank Transfer Details
                  </p>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Bank Name
                    </label>

                    <input
                      type="text"
                      value={bankName}
                      onChange={(e) =>
                        setBankName(e.target.value)
                      }
                      placeholder="e.g. HBL, UBL, Meezan Bank"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Transaction / Reference No.
                    </label>

                    <input
                      type="text"
                      value={transactionReference}
                      onChange={(e) =>
                        setTransactionReference(e.target.value)
                      }
                      placeholder="Transaction reference"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Easypaisa / JazzCash */}
              {(paymentMethod === "EASYPAISA" ||
                paymentMethod === "JAZZCASH") && (
                <div className="mt-4 space-y-3 rounded-lg bg-gray-50 p-4">
                  <p className="text-sm font-semibold text-gray-800">
                    {paymentMethod === "EASYPAISA"
                      ? "Easypaisa"
                      : "JazzCash"}{" "}
                    Payment Details
                  </p>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Mobile Number
                    </label>

                    <input
                      type="tel"
                      value={mobileNumber}
                      onChange={(e) =>
                        setMobileNumber(e.target.value)
                      }
                      placeholder="03XX-XXXXXXX"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-600">
                      Transaction / Reference No.
                    </label>

                    <input
                      type="text"
                      value={transactionReference}
                      onChange={(e) =>
                        setTransactionReference(e.target.value)
                      }
                      placeholder="Transaction reference"
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Paid Amount */}
              <div className="mt-4">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Paid Amount
                </label>

                <input
                  type="number"
                  min="0"
                  value={paidAmount}
                  onChange={(e) =>
                    setPaidAmount(e.target.value)
                  }
                  placeholder="Enter paid amount"
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 border-t pt-4">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>Rs. {subtotal}</span>
              </div>

              <div className="mt-2 flex justify-between text-sm">
                <span>Discount</span>
                <span>Rs. {discount}</span>
              </div>

              <div className="mt-4 flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>Rs. {total}</span>
              </div>

              <div className="mt-4 space-y-2 rounded-lg bg-gray-50 p-4">
                <div className="flex justify-between text-sm">
                  <span>Paid</span>
                  <span className="font-semibold">
                    Rs. {paid}
                  </span>
                </div>

                {change > 0 ? (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>Change</span>
                    <span className="font-semibold">
                      Rs. {change}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Remaining Due</span>
                    <span className="font-semibold">
                      Rs. {remainingDue}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-sm">
                  <span>Status</span>

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

              <button
                type="button"
                disabled={
                  cart.length === 0 || completingSale
                }
                onClick={handleCompleteSale}
                className="mt-5 w-full rounded-lg bg-blue-600 p-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {completingSale
                  ? "Processing Sale..."
                  : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}