"use client";

import { FormEvent, useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";
type Category = {
  id: string;
  name: string;
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [name, setName] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const loadCategories = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();

      setCategories(data);
      setLoading(false);
    } catch (error) {
      console.error("Failed to load categories:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        const data = await response.json();

        if (!cancelled) {
          setCategories(data);
          setLoading(false);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);

        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchCategories();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      alert("Category name is required.");
      return;
    }

    setSaving(true);

    try {
      const url = editingId
        ? `/api/categories/${editingId}`
        : "/api/categories";

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(
          editingId
            ? "Failed to update category"
            : "Failed to create category"
        );
      }

      setName("");
      setEditingId(null);
      setShowForm(false);

      await loadCategories();

      alert(
        editingId
          ? "Category updated successfully!"
          : "Category added successfully!"
      );
    } catch (error) {
      console.error(error);

      alert(
        editingId
          ? "Failed to update category."
          : "Failed to add category."
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingId(category.id);
    setName(category.name);
    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (category: Category) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.name}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      const response = await fetch(
        `/api/categories/${category.id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const data = await response.json();

        throw new Error(
          data.message || "Failed to delete category"
        );
      }

      await loadCategories();

      alert("Category deleted successfully!");
    } catch (error) {
      console.error(error);

      alert(
        error instanceof Error
          ? error.message
          : "Failed to delete category."
      );
    }
  };

  const handleAddCategory = () => {
    setEditingId(null);
    setName("");
    setShowForm(true);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingId(null);
    setName("");
  };

  return (
  <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
  <Sidebar />

  <main className="flex-1 p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Categories
          </h1>

          <p className="mt-1 text-gray-500">
            Manage your product categories
          </p>
        </div>

        <button
          onClick={
            showForm && !editingId
              ? handleCloseForm
              : handleAddCategory
          }
          className="rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
        >
          {showForm && !editingId
            ? "Close Form"
            : "+ Add Category"}
        </button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold">
              {editingId
                ? "Edit Category"
                : "Add New Category"}
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
            className="flex flex-col gap-4 sm:flex-row"
          >
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Beverages"
              className="w-full rounded-lg border p-3 outline-none focus:border-blue-500"
            />

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white hover:bg-green-700 disabled:opacity-50"
            >
              {saving
                ? "Saving..."
                : editingId
                ? "Save Changes"
                : "Save Category"}
            </button>
          </form>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <table className="w-full">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 text-left">
                Category Name
              </th>

              <th className="p-4 text-left">
                Actions
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={2}
                  className="p-8 text-center"
                >
                  Loading categories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  className="p-8 text-center text-gray-500"
                >
                  No categories found.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr
                  key={category.id}
                  className="border-t"
                >
                  <td className="p-4 font-medium">
                    {category.name}
                  </td>

                  <td className="p-4">
                    <button
                      onClick={() =>
                        handleEdit(category)
                      }
                      className="rounded-lg bg-blue-100 px-3 py-2 text-sm text-blue-700 hover:bg-blue-200"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() =>
                        handleDelete(category)
                      }
                      className="ml-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-700 hover:bg-red-200"
                    >
                      Delete
                    </button>
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