"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  costPrice: number;
  stock: number;
};

type Supplier = {
  id: string;
  name: string;
  phone: string | null;
};

type PurchaseCartItem = {
  productId: string;
  name: string;
  quantity: number;
  costPrice: number;
};

type Purchase = {
  id: string;
  invoiceNo: string | null;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  paidAmount: number;
  createdAt: string;
  supplier: Supplier | null;
  items: {
    id: string;
    quantity: number;
    costPrice: number;
    product: {
      name: string;
    };
  }[];
};

export default function PurchasesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);

  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [costPrice, setCostPrice] = useState("");

  const [invoiceNo, setInvoiceNo] = useState("");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [paidAmount, setPaidAmount] = useState("0");

  const [cart, setCart] = useState<PurchaseCartItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const [productsResponse, suppliersResponse, purchasesResponse] =
        await Promise.all([
          fetch("/api/products"),
          fetch("/api/suppliers"),
          fetch("/api/purchases"),
        ]);

      if (!productsResponse.ok) {
        throw new Error("Failed to load products");
      }

      if (!suppliersResponse.ok) {
        throw new Error("Failed to load suppliers");
      }

      if (!purchasesResponse.ok) {
        throw new Error("Failed to load purchases");
      }

      const productsData = await productsResponse.json();
      const suppliersData = await suppliersResponse.json();
      const purchasesData = await purchasesResponse.json();

      setProducts(productsData);
      setSuppliers(suppliersData);
      setPurchases(purchasesData);
    } catch (error) {
      console.error("Purchase Data Error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleProductChange = (productId: string) => {
    setSelectedProductId(productId);

    const product = products.find(
      (item) => item.id === productId
    );

    if (product) {
      setCostPrice(String(product.costPrice || ""));
    } else {
      setCostPrice("");
    }
  };

  const addToCart = () => {
    if (!selectedProductId) {
      alert("Please select a product.");
      return;
    }

    const product = products.find(
      (item) => item.id === selectedProductId
    );

    if (!product) {
      alert("Product not found.");
      return;
    }

    const qty = Number(quantity);
    const price = Number(costPrice);

    if (!qty || qty <= 0) {
      alert("Enter a valid quantity.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      alert("Enter a valid cost price.");
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => item.productId === product.id
      );

      if (existing) {
        return currentCart.map((item) =>
          item.productId === product.id
            ? {
                ...item,
                quantity: item.quantity + qty,
                costPrice: price,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          productId: product.id,
          name: product.name,
          quantity: qty,
          costPrice: price,
        },
      ];
    });

    setSelectedProductId("");
    setQuantity("1");
    setCostPrice("");
  };

  const removeFromCart = (productId: string) => {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => item.productId !== productId
      )
    );
  };

  const updateQuantity = (
    productId: string,
    newQuantity: number
  ) => {
    if (!Number.isFinite(newQuantity) || newQuantity <= 0) {
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.productId === productId
          ? {
              ...item,
              quantity: Math.floor(newQuantity),
            }
          : item
      )
    );
  };

  const updateCostPrice = (
    productId: string,
    newPrice: number
  ) => {
    if (!Number.isFinite(newPrice) || newPrice < 0) {
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.productId === productId
          ? {
              ...item,
              costPrice: newPrice,
            }
          : item
      )
    );
  };

  const subtotal = cart.reduce(
    (total, item) =>
      total + item.quantity * item.costPrice,
    0
  );

  const discountAmount = Number(discount) || 0;
  const taxAmount = Number(tax) || 0;

  const total =
    subtotal - discountAmount + taxAmount;

  const paid = Number(paidAmount) || 0;

  const remaining = Math.max(total - paid, 0);

  const handleCompletePurchase = async () => {
  if (cart.length === 0) {
    alert("Please add at least one product.");
    return;
  }

  if (!selectedSupplierId) {
    alert("Please select a supplier before completing the purchase.");
    return;
  }

  if (discountAmount < 0 || taxAmount < 0) {
    alert("Discount and tax cannot be negative.");
    return;
  }

    if (paid < 0 || paid > total) {
      alert("Invalid paid amount.");
      return;
    }

    try {
      setSaving(true);

      const response = await fetch("/api/purchases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          invoiceNo,
          supplierId: selectedSupplierId || null,
          discount: discountAmount,
          tax: taxAmount,
          paidAmount: paid,
          items: cart.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            costPrice: item.costPrice,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.message ||
            "Failed to complete purchase."
        );
        return;
      }

      alert("Purchase completed successfully.");

      setCart([]);
      setInvoiceNo("");
      setSelectedSupplierId("");
      setDiscount("0");
      setTax("0");
      setPaidAmount("0");

      await fetchData();
    } catch (error) {
      console.error(
        "Complete Purchase Error:",
        error
      );

      alert("Something went wrong.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Purchases
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            Record purchases and increase product stock.
          </p>
        </div>

        {/* Purchase Entry */}
        <div className="mb-6 rounded-xl bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            New Purchase
          </h2>

          <div className="mb-6 grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Invoice Number
              </label>

              <input
                type="text"
                value={invoiceNo}
                onChange={(e) =>
                  setInvoiceNo(e.target.value)
                }
                placeholder="Optional"
                className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Supplier
              </label>

              <select
                value={selectedSupplierId}
                onChange={(e) =>
                  setSelectedSupplierId(e.target.value)
                }
                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
              >
                <option value="">
                  Select Supplier
                </option>

                {suppliers.map((supplier) => (
                  <option
                    key={supplier.id}
                    value={supplier.id}
                  >
                    {supplier.name}
                    {supplier.phone
                      ? ` - ${supplier.phone}`
                      : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Add Product */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="mb-4 text-sm font-semibold text-gray-900">
              Add Product
            </h3>

            <div className="grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Product
                </label>

                <select
                  value={selectedProductId}
                  onChange={(e) =>
                    handleProductChange(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                >
                  <option value="">
                    Select Product
                  </option>

                  {products.map((product) => (
                    <option
                      key={product.id}
                      value={product.id}
                    >
                      {product.name}
                      {product.sku
                        ? ` - ${product.sku}`
                        : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Quantity
                </label>

                <input
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) =>
                    setQuantity(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Cost Price
                </label>

                <input
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={(e) =>
                    setCostPrice(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={addToCart}
              className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add Product
            </button>
          </div>

          {/* Purchase Cart */}
          <div className="mt-6 overflow-x-auto">
            <table className="w-full min-w-[650px]">
              <thead className="border-b bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                    Product
                  </th>

                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Quantity
                  </th>

                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Cost Price
                  </th>

                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                    Total
                  </th>

                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                    Action
                  </th>
                </tr>
              </thead>

              <tbody>
                {cart.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-gray-500"
                    >
                      No products added yet.
                    </td>
                  </tr>
                ) : (
                  cart.map((item) => (
                    <tr
                      key={item.productId}
                      className="border-b"
                    >
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.name}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateQuantity(
                              item.productId,
                              Number(e.target.value)
                            )
                          }
                          className="w-20 rounded-lg border border-gray-300 px-2 py-1.5 text-center text-sm"
                        />
                      </td>

                      <td className="px-4 py-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={item.costPrice}
                          onChange={(e) =>
                            updateCostPrice(
                              item.productId,
                              Number(e.target.value)
                            )
                          }
                          className="w-28 rounded-lg border border-gray-300 px-2 py-1.5 text-right text-sm"
                        />
                      </td>

                      <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                        Rs.{" "}
                        {(
                          item.quantity *
                          item.costPrice
                        ).toFixed(2)}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <button
                          type="button"
                          onClick={() =>
                            removeFromCart(
                              item.productId
                            )
                          }
                          className="rounded-lg bg-red-600 px-3 py-2 text-xs font-medium text-white hover:bg-red-700"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Discount
                </label>

                <input
                  type="number"
                  min="0"
                  value={discount}
                  onChange={(e) =>
                    setDiscount(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">
                  Tax
                </label>

                <input
                  type="number"
                  min="0"
                  value={tax}
                  onChange={(e) =>
                    setTax(e.target.value)
                  }
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
                />
              </div>

              <div>
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
                  className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm"
                />
              </div>
            </div>

            <div className="rounded-xl bg-gray-50 p-5">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Subtotal
                  </span>

                  <span className="font-medium">
                    Rs. {subtotal.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Discount
                  </span>

                  <span className="font-medium">
                    Rs. {discountAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Tax
                  </span>

                  <span className="font-medium">
                    Rs. {taxAmount.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between border-t pt-3 text-lg font-bold">
                  <span>Total</span>

                  <span>
                    Rs. {total.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">
                    Paid
                  </span>

                  <span className="font-medium">
                    Rs. {paid.toFixed(2)}
                  </span>
                </div>

                <div className="flex justify-between text-sm font-semibold">
                  <span>Remaining</span>

                  <span>
                    Rs. {remaining.toFixed(2)}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleCompletePurchase}
                disabled={saving || cart.length === 0}
                className="mt-5 w-full rounded-lg bg-green-600 px-5 py-3 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving
                  ? "Saving Purchase..."
                  : "Complete Purchase"}
              </button>
            </div>
          </div>
        </div>

        {/* Purchase History */}
        <div className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="border-b px-6 py-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Purchase History
            </h2>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500">
              Loading purchases...
            </div>
          ) : purchases.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No purchases found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px]">
                <thead className="border-b bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Invoice
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Supplier
                    </th>

                    <th className="px-6 py-4 text-center text-sm font-semibold text-gray-700">
  Total Qty
</th>

                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Total
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Paid
                    </th>

                    <th className="px-6 py-4 text-right text-sm font-semibold text-gray-700">
                      Remaining
                    </th>

                    <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">
                      Date
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {purchases.map((purchase) => {
  const remainingAmount = Math.max(
    purchase.total - purchase.paidAmount,
    0
  );

  const totalQuantity = purchase.items.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  return (
                      <tr
                        key={purchase.id}
                        className="border-b last:border-b-0 hover:bg-gray-50"
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          {purchase.invoiceNo || "-"}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-700">
                          {purchase.supplier?.name ||
                            "No Supplier"}
                        </td>

                        <td className="px-6 py-4 text-center text-sm text-gray-700">
  {totalQuantity}
</td>

                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          Rs.{" "}
                          {purchase.total.toFixed(2)}
                        </td>

                        <td className="px-6 py-4 text-right text-sm text-gray-700">
                          Rs.{" "}
                          {purchase.paidAmount.toFixed(
                            2
                          )}
                        </td>

                        <td className="px-6 py-4 text-right text-sm font-medium text-gray-900">
                          Rs.{" "}
                          {remainingAmount.toFixed(2)}
                        </td>

                        <td className="px-6 py-4 text-sm text-gray-700">
                          {new Date(
                            purchase.createdAt
                          ).toLocaleDateString()}
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