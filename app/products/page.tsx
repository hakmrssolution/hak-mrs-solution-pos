"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Product = {
  id: string;
  name: string;
  sku: string | null;
  barcode: string | null;
  price: number;
  costPrice: number;
  stock: number;
  minStock: number;
  isActive: boolean;
  categoryId: string | null;
  category: {
    id: string;
    name: string;
  } | null;
};

type Category = {
  id: string;
  name: string;
};

const emptyForm = {
  name: "",
  sku: "",
  barcode: "",
  costPrice: "",
  price: "",
  stock: "",
  minStock: "5",
};

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const [showInactive, setShowInactive] = useState(false);

  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState(emptyForm);

  const loadProducts = async (inactive = showInactive) => {
    try {
      setLoading(true);
const url = inactive
  ? "/api/products?inactiveOnly=true"
  : "/api/products";

      const response = await fetch(url);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Failed to load products"
        );
      }

      setProducts(data);
    } catch (error) {
      console.error("Failed to load products:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to load products."
      );
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter((product) => {
    const searchTerm = search.toLowerCase();

    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm) ||
      (product.sku || "").toLowerCase().includes(searchTerm) ||
      (product.barcode || "").toLowerCase().includes(searchTerm);

    const matchesCategory =
      !categoryFilter ||
      product.categoryId === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  useEffect(() => {
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [productsResponse, categoriesResponse] =
          await Promise.all([
            fetch("/api/products"),
            fetch("/api/categories"),
          ]);

        const productsData = await productsResponse.json();
        const categoriesData = await categoriesResponse.json();

        if (!productsResponse.ok) {
          throw new Error(
            productsData?.message ||
              "Failed to load products"
          );
        }

        if (!categoriesResponse.ok) {
          throw new Error(
            categoriesData?.message ||
              "Failed to load categories"
          );
        }

        if (!cancelled) {
          setProducts(productsData);
          setCategories(categoriesData);
          setLoading(false);
        }
      } catch (error) {
        console.error(
          "Failed to load products/categories:",
          error
        );

        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchData();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!form.name || !form.costPrice || !form.price) {
      alert(
        "Product name, cost price and sale price are required."
      );
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/api/products/${editingId}`
        : "/api/products";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          categoryId,
        }),
      });

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.message ||
            (editingId
              ? "Failed to update product"
              : "Failed to create product")
        );
      }

      setForm(emptyForm);
      setCategoryId("");
      setEditingId(null);
      setShowForm(false);

      await loadProducts(showInactive);

      alert(
        editingId
          ? "Product updated successfully!"
          : "Product added successfully!"
      );
    } catch (error) {
      console.error("Product Save Error:", error);

      alert(
        error instanceof Error
          ? error.message
          : editingId
          ? "Failed to update product."
          : "Failed to add product."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingId(product.id);

    setForm({
      name: product.name,
      sku: product.sku || "",
      barcode: product.barcode || "",
      costPrice: String(product.costPrice),
      price: String(product.price),
      stock: String(product.stock),
      minStock: String(product.minStock),
    });

    setCategoryId(product.categoryId || "");
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Are you sure you want to deactivate "${product.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/products/${product.id}`,
        {
          method: "DELETE",
        }
      );

      const errorData = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          errorData?.message ||
            "Failed to deactivate product"
        );
      }

      await loadProducts(false);

      alert("Product deactivated successfully!");
    } catch (error) {
      console.error("Product Deactivate Error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to deactivate product."
      );
    }
  };

  const handleRestore = async (product: Product) => {
    const confirmed = window.confirm(
      `Restore "${product.name}" and make it active again?`
    );

    if (!confirmed) {
      return;
    }

    setRestoringId(product.id);

    try {
      const response = await fetch(
        `/api/products/${product.id}`,
        {
          method: "PATCH",
        }
      );

      const errorData = await response
        .json()
        .catch(() => null);

      if (!response.ok) {
        throw new Error(
          errorData?.message ||
            "Failed to restore product"
        );
      }

      await loadProducts(true);

      alert("Product restored successfully!");
    } catch (error) {
      console.error("Product Restore Error:", error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to restore product."
      );
    } finally {
      setRestoringId(null);
    }
  };

  const handleToggleInactive = async () => {
    const nextValue = !showInactive;

    setShowInactive(nextValue);
    setSearch("");
    setCategoryFilter("");

    await loadProducts(nextValue);
  };

  const handleAddProduct = () => {
    setEditingId(null);
    setForm(emptyForm);
    setCategoryId("");
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
    setCategoryId("");
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />

      <main className="flex-1 p-8">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Products
            </h1>

            <p className="mt-1 text-gray-500">
              {showInactive
                ? "View and restore inactive products"
                : "Manage your products and inventory"}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleToggleInactive}
              className="rounded-lg border bg-white px-5 py-3 font-medium text-gray-700 hover:bg-gray-50"
            >
              {showInactive
                ? "← Active Products"
                : "Inactive Products"}
            </button>

            {!showInactive && (
              <button
                onClick={
                  showForm && !editingId
                    ? handleCloseForm
                    : handleAddProduct
                }
                className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
              >
                {showForm && !editingId
                  ? "Close Form"
                  : "+ Add Product"}
              </button>
            )}
          </div>
        </div>

        {showForm && !showInactive && (
          <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold">
                {editingId
                  ? "Edit Product"
                  : "Add New Product"}
              </h2>

              {editingId && (
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="text-sm text-gray-500 hover:text-gray-800"
                >
                  Cancel Edit
                </button>
              )}
            </div>

            <form
              onSubmit={handleSubmit}
              className="grid grid-cols-1 gap-5 md:grid-cols-2"
            >
              <div>
                <label className="mb-2 block text-sm font-medium">
                  Product Name *
                </label>

                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      name: e.target.value,
                    })
                  }
                  placeholder="e.g. Coca Cola 1.5L"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  SKU
                </label>

                <input
                  type="text"
                  value={form.sku}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      sku: e.target.value,
                    })
                  }
                  placeholder="e.g. COKE-1500"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Category
                </label>

                <select
                  value={categoryId}
                  onChange={(e) =>
                    setCategoryId(e.target.value)
                  }
                  className="w-full rounded-lg border bg-white p-3"
                >
                  <option value="">Select Category</option>

                  {categories.map((category) => (
                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Barcode
                </label>

                <input
                  type="text"
                  value={form.barcode}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      barcode: e.target.value,
                    })
                  }
                  placeholder="Scan or enter barcode"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Cost Price *
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={form.costPrice}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      costPrice: e.target.value,
                    })
                  }
                  placeholder="Purchase price"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Sale Price *
                </label>

                <input
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: e.target.value,
                    })
                  }
                  placeholder="Selling price"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Opening Stock
                </label>

                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      stock: e.target.value,
                    })
                  }
                  placeholder="0"
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium">
                  Minimum Stock
                </label>

                <input
                  type="number"
                  value={form.minStock}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      minStock: e.target.value,
                    })
                  }
                  className="w-full rounded-lg border p-3"
                />
              </div>

              <div className="md:col-span-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {saving
                    ? "Saving..."
                    : editingId
                    ? "Save Changes"
                    : "Save Product"}
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full max-w-md">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                showInactive
                  ? "Search inactive product..."
                  : "Search product, SKU or barcode..."
              }
              className="w-full rounded-lg border bg-white px-4 py-3 pr-10 outline-none focus:border-blue-500"
            />

            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                ✕
              </button>
            )}
          </div>

          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value)
            }
            className="w-full rounded-lg border bg-white px-4 py-3 outline-none focus:border-blue-500 md:w-64"
          >
            <option value="">All Categories</option>

            {categories.map((category) => (
              <option
                key={category.id}
                value={category.id}
              >
                {category.name}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4 rounded-lg border bg-white px-4 py-3 text-sm text-gray-600">
          {showInactive
            ? `Showing ${filteredProducts.length} inactive product${
                filteredProducts.length === 1 ? "" : "s"
              }`
            : `Showing ${filteredProducts.length} active product${
                filteredProducts.length === 1 ? "" : "s"
              }`}
        </div>

        <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-4 text-left">Product</th>
                <th className="p-4 text-left">Category</th>
                <th className="p-4 text-left">SKU</th>
                <th className="p-4 text-left">Barcode</th>
                <th className="p-4 text-left">Cost Price</th>
                <th className="p-4 text-left">Sale Price</th>
                <th className="p-4 text-left">Stock</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">Actions</th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-9 text-center"
                  >
                    Loading products...
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="p-9 text-center text-gray-500"
                  >
                    {showInactive
                      ? "No inactive products found."
                      : "No products found."}
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="border-t"
                  >
                    <td className="p-4 font-medium">
                      {product.name}
                    </td>

                    <td className="p-4">
                      {product.category?.name || "-"}
                    </td>

                    <td className="p-4">
                      {product.sku || "-"}
                    </td>

                    <td className="p-4">
                      {product.barcode || "-"}
                    </td>

                    <td className="p-4">
                      Rs.{" "}
                      {product.costPrice.toLocaleString()}
                    </td>

                    <td className="p-4">
                      Rs.{" "}
                      {product.price.toLocaleString()}
                    </td>

                    <td className="p-4">
                      {product.stock}
                    </td>

                    <td className="p-4">
                      {showInactive ? (
                        <span className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-700">
                          Inactive
                        </span>
                      ) : product.stock <= product.minStock ? (
                        <span className="rounded-full bg-red-100 px-3 py-1 text-sm text-red-700">
                          Low Stock
                        </span>
                      ) : (
                        <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">
                          In Stock
                        </span>
                      )}
                    </td>

                    <td className="p-4">
                      <div className="flex gap-2">
                        {showInactive ? (
                          <button
                            onClick={() =>
                              handleRestore(product)
                            }
                            disabled={
                              restoringId === product.id
                            }
                            className="rounded-lg bg-green-100 px-3 py-2 text-sm text-green-700 hover:bg-green-200 disabled:opacity-50"
                          >
                            {restoringId === product.id
                              ? "Restoring..."
                              : "Restore"}
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() =>
                                handleEdit(product)
                              }
                              className="rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-700 hover:bg-blue-200"
                            >
                              Edit
                            </button>

                            <button
                              onClick={() =>
                                handleDelete(product)
                              }
                              className="rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200"
                            >
                              Deactivate
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}