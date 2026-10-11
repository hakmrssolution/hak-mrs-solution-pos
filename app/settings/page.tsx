"use client";

import { useEffect, useState } from "react";
import Sidebar from "@/components/Sidebar";

type Business = {
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

type Backup = {
  fileName: string;
  size: number;
  createdAt: string;
};

export default function SettingsPage() {
  const [business, setBusiness] = useState<Business | null>(null);

  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [logo, setLogo] = useState("");

  const [currency, setCurrency] = useState("Rs.");
  const [receiptFooter, setReceiptFooter] = useState("Thank You!");

  const [showLogo, setShowLogo] = useState(true);
  const [showPhone, setShowPhone] = useState(true);
  const [showEmail, setShowEmail] = useState(true);
  const [showAddress, setShowAddress] = useState(true);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Backup states
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupMessage, setBackupMessage] = useState("");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [backupListLoading, setBackupListLoading] = useState(false);

  // Load business settings
  useEffect(() => {
    async function loadBusiness() {
      try {
        const response = await fetch("/api/business");

        if (!response.ok) {
          throw new Error("Failed to load business");
        }

        const data = await response.json();

        setBusiness(data);

        setName(data.name || "");
        setAddress(data.address || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setLogo(data.logo || "");

        setCurrency(data.currency || "Rs.");
        setReceiptFooter(data.receiptFooter || "Thank You!");

        setShowLogo(data.showLogo ?? true);
        setShowPhone(data.showPhone ?? true);
        setShowEmail(data.showEmail ?? true);
        setShowAddress(data.showAddress ?? true);
      } catch (error) {
        console.error("Business Load Error:", error);
        setMessage("Failed to load business settings.");
      } finally {
        setLoading(false);
      }
    }

    loadBusiness();
  }, []);

  // Load backup list
  useEffect(() => {
    loadBackups();
  }, []);

  async function loadBackups() {
    setBackupListLoading(true);

    try {
      const response = await fetch("/api/backup/list");

      const responseText = await response.text();

      let data: {
        backups?: Backup[];
        message?: string;
      } = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Invalid backup list response: ${responseText.slice(0, 300)}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load backups."
        );
      }

      setBackups(data.backups || []);
    } catch (error) {
      console.error("Backup List Error:", error);
    } finally {
      setBackupListLoading(false);
    }
  }

  async function handleSave() {
    setMessage("");

    if (!name.trim()) {
      setMessage("Business name is required.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/business", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          address,
          phone,
          email,
          logo,
          currency,
          receiptFooter,
          showLogo,
          showPhone,
          showEmail,
          showAddress,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to save settings"
        );
      }

      setBusiness(data);
      setMessage("Settings saved successfully.");
    } catch (error) {
      console.error("Save Settings Error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to save settings."
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleBackup() {
    setBackupMessage("");
    setBackupLoading(true);

    try {
      const response = await fetch("/api/backup", {
        method: "POST",
      });

      const responseText = await response.text();

      let data: {
        message?: string;
        fileName?: string;
        size?: number;
      } = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Invalid backup response: ${responseText.slice(0, 500)}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to create backup."
        );
      }

      const sizeKB = Math.ceil((data.size || 0) / 1024);

      setBackupMessage(
        `Backup created successfully: ${
          data.fileName || "Backup file"
        } (${sizeKB} KB)`
      );

      await loadBackups();
    } catch (error) {
      console.error("Backup Error:", error);

      setBackupMessage(
        error instanceof Error
          ? error.message
          : "Failed to create backup."
      );
    } finally {
      setBackupLoading(false);
    }
  }

  async function handleRestore(fileName: string) {
    const confirmed = window.confirm(
      `WARNING!\n\nRestore this backup?\n\n${fileName}\n\n` +
        "Your current database will be replaced by this backup.\n\n" +
        "A safety backup of the current database will be created automatically before restore.\n\n" +
        "Do you want to continue?"
    );

    if (!confirmed) {
      return;
    }

    setBackupMessage("");
    setBackupListLoading(true);

    try {
      const response = await fetch("/api/backup/restore", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fileName,
        }),
      });

      const responseText = await response.text();

      console.log(
        "Restore HTTP Status:",
        response.status
      );

      console.log(
        "Restore Response:",
        responseText
      );

      let data: {
        message?: string;
        restoredFile?: string;
        safetyBackup?: string;
      } = {};

      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          `Server returned an invalid response (${response.status}): ${responseText.slice(
            0,
            500
          )}`
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            `Restore failed with status ${response.status}.`
        );
      }

      setBackupMessage(
        data.message ||
          `Database restored successfully from ${fileName}.`
      );

      await loadBackups();
    } catch (error) {
      console.error("Restore Error:", error);

      setBackupMessage(
        error instanceof Error
          ? error.message
          : "Failed to restore database."
      );

      await loadBackups();
    } finally {
      setBackupListLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-gray-600">
              Loading settings...
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-5xl">

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Business Settings
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your business information and receipt settings.
            </p>
          </div>

          {/* Main Message */}
          {message && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                message.includes("successfully")
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <div className="space-y-6">
{/* License & Subscription */}
<section className="rounded-xl bg-white p-6 shadow-sm">
  <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
    <div>
      <h2 className="text-lg font-semibold text-gray-900">
        License & Subscription
      </h2>

      <p className="mt-1 text-sm text-gray-500">
        Manage your HAK MRS POS license, activation and subscription.
      </p>
    </div>

    <a
      href="/settings/license"
      className="inline-flex w-fit items-center justify-center rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
    >
      Manage License
    </a>
  </div>

  <div className="mt-5 rounded-lg border border-blue-100 bg-blue-50 p-4">
    <p className="text-sm font-medium text-gray-900">
      License Management
    </p>

    <p className="mt-1 text-sm text-gray-600">
      View your current license status, activation details and
      subscription information.
    </p>
  </div>
</section>
            {/* Business Information */}
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Business Information
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  These details will be used throughout your POS system.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* Business Name */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Business Name
                  </label>

                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter business name"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Address */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Address
                  </label>

                  <textarea
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="Enter business address"
                    rows={3}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Phone
                  </label>

                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="Enter phone number"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email
                  </label>

                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Logo URL */}
                <div className="md:col-span-2">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Logo URL
                  </label>

                  <input
                    type="text"
                    value={logo}
                    onChange={(e) => setLogo(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />

                  {logo && (
                    <div className="mt-4 flex items-center gap-4">
                      <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg border bg-gray-50">
                        <img
                          src={logo}
                          alt="Business Logo"
                          className="max-h-full max-w-full object-contain"
                          onError={(e) => {
                            e.currentTarget.style.display =
                              "none";
                          }}
                        />
                      </div>

                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          Logo Preview
                        </p>

                        <p className="mt-1 text-xs text-gray-500">
                          This logo can appear on your receipt.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </section>

            {/* Receipt Settings */}
            <section className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Receipt Settings
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Customize how your sales receipts will appear.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">

                {/* Currency */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Currency
                  </label>

                  <input
                    type="text"
                    value={currency}
                    onChange={(e) =>
                      setCurrency(e.target.value)
                    }
                    placeholder="Rs."
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Example: Rs., PKR, $, €
                  </p>
                </div>

                {/* Receipt Footer */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Receipt Footer
                  </label>

                  <input
                    type="text"
                    value={receiptFooter}
                    onChange={(e) =>
                      setReceiptFooter(e.target.value)
                    }
                    placeholder="Thank You!"
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                  />

                  <p className="mt-1 text-xs text-gray-500">
                    Message shown at the bottom of the receipt.
                  </p>
                </div>
              </div>

              {/* Receipt Visibility */}
              <div className="mt-8">
                <h3 className="mb-4 text-sm font-semibold text-gray-900">
                  Receipt Information Visibility
                </h3>

                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">

                  {/* Logo */}
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Show Logo
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Display business logo on receipt.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={showLogo}
                      onChange={(e) =>
                        setShowLogo(e.target.checked)
                      }
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  {/* Phone */}
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Show Phone
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Display business phone on receipt.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={showPhone}
                      onChange={(e) =>
                        setShowPhone(e.target.checked)
                      }
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  {/* Email */}
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Show Email
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Display business email on receipt.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={showEmail}
                      onChange={(e) =>
                        setShowEmail(e.target.checked)
                      }
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                  {/* Address */}
                  <label className="flex cursor-pointer items-center justify-between rounded-lg border border-gray-200 p-4 hover:bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        Show Address
                      </p>

                      <p className="mt-1 text-xs text-gray-500">
                        Display business address on receipt.
                      </p>
                    </div>

                    <input
                      type="checkbox"
                      checked={showAddress}
                      onChange={(e) =>
                        setShowAddress(e.target.checked)
                      }
                      className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </label>

                </div>
              </div>
            </section>

            {/* Backup & Restore */}
            <section className="rounded-xl bg-white p-6 shadow-sm">

              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Backup & Restore
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Protect your POS data by creating a complete database backup.
                </p>
              </div>

              {/* Create Backup */}
              <div className="rounded-lg border border-blue-100 bg-blue-50 p-5">

                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

                  <div>
                    <h3 className="text-sm font-semibold text-gray-900">
                      Database Backup
                    </h3>

                    <p className="mt-1 text-sm text-gray-600">
                      Creates a complete backup of your products,
                      sales, purchases, customers, suppliers,
                      expenses and settings.
                    </p>

                    <p className="mt-2 text-xs text-gray-500">
                      Backup location:
                      {" "}
                      C:\HAK-MRS-POS-Backups
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleBackup}
                    disabled={backupLoading}
                    className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {backupLoading
                      ? "Creating Backup..."
                      : "Create Backup"}
                  </button>

                </div>

                {backupMessage && (
                  <div
                    className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
                      backupMessage.includes(
                        "successfully"
                      )
                        ? "border-green-200 bg-green-50 text-green-700"
                        : "border-red-200 bg-red-50 text-red-700"
                    }`}
                  >
                    {backupMessage}
                  </div>
                )}

              </div>

              {/* Recent Backups */}
              <div className="mt-6">

                <div className="mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">
                    Recent Backups
                  </h3>

                  <p className="mt-1 text-xs text-gray-500">
                    Your database backup files are stored securely
                    on this computer.
                  </p>
                </div>

                {backupListLoading ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                    Loading backups...
                  </div>
                ) : backups.length === 0 ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-sm text-gray-500">
                    No backups found.
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-lg border border-gray-200">

                    {backups.map((backup) => (
                      <div
                        key={backup.fileName}
                        className="flex flex-col gap-3 border-b border-gray-200 px-4 py-4 last:border-b-0 md:flex-row md:items-center md:justify-between"
                      >

                        <div>
                          <p className="break-all text-sm font-medium text-gray-900">
                            {backup.fileName}
                          </p>

                          <p className="mt-1 text-xs text-gray-500">
                            {Math.ceil(
                              backup.size / 1024
                            )}{" "}
                            KB
                            {" • "}
                            {new Date(
                              backup.createdAt
                            ).toLocaleString()}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">

                          <span className="inline-flex rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                            Backup Ready
                          </span>

                          <button
                            type="button"
                            onClick={() =>
                              handleRestore(
                                backup.fileName
                              )
                            }
                            disabled={
                              backupListLoading ||
                              backupLoading
                            }
                            className="rounded-lg bg-orange-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Restore
                          </button>

                        </div>
                      </div>
                    ))}

                  </div>
                )}
              </div>

            </section>

            {/* Current Business Profile */}
            {business && (
              <section className="rounded-xl bg-white p-6 shadow-sm">

                <div className="mb-5">
                  <h2 className="text-lg font-semibold text-gray-900">
                    Current Business Profile
                  </h2>

                  <p className="mt-1 text-sm text-gray-500">
                    Preview of your saved business information.
                  </p>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Business Name
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {business.name || "Not set"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Phone
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {business.phone || "Not set"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Email
                    </p>

                    <p className="mt-1 break-words font-medium text-gray-900">
                      {business.email || "Not set"}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Currency
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {business.currency || "Rs."}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4 sm:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Address
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {business.address || "Not set"}
                    </p>
                  </div>

                </div>
              </section>
            )}

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving
                  ? "Saving..."
                  : "Save Settings"}
              </button>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}