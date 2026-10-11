"use client";

import { useEffect, useRef, useState } from "react";
import Sidebar from "@/components/Sidebar";

type License = {
  id: string;
  licenseKey: string;
  type: string;
  status: string;
  activatedAt: string | null;
  expiresAt: string | null;
};

type LicenseResponse = {
  active: boolean;
  license: License | null;
  message?: string;
  trialAvailable?: boolean;
};

const licenseTypes = [
  {
    type: "TRIAL",
    name: "7-Day Free Trial",
    price: "Free",
    period: "",
    description: "Try HAK MRS POS free for 7 days.",
    features: [
      "7 days full access",
      "No payment required",
      "One trial per installation",
    ],
  },
  {
    type: "MONTHLY",
    name: "Monthly",
    price: "Rs. 2,500",
    period: "/ 30 days",
    description: "Flexible monthly POS license.",
    features: [
      "30 days access",
      "1 POS installation",
      "Renew anytime",
    ],
  },
  {
    type: "YEARLY",
    name: "Yearly",
    price: "Rs. 20,000",
    period: "/ year",
    description: "Save with a yearly POS license.",
    features: [
      "365 days access",
      "1 POS installation",
      "Easy yearly renewal",
    ],
  },
  {
    type: "LIFETIME",
    name: "Lifetime",
    price: "Rs. 50,000",
    period: " one-time",
    description: "One-time payment with no expiry.",
    features: [
      "Lifetime access",
      "1 POS installation",
      "No recurring payment",
    ],
  },
];

export default function LicensePage() {
  const [data, setData] = useState<LicenseResponse | null>(null);

  const [selectedType, setSelectedType] = useState("TRIAL");

  const [loading, setLoading] = useState(true);

  const [processing, setProcessing] = useState(false);

  const [verifyingPayment, setVerifyingPayment] = useState(false);

  const [message, setMessage] = useState("");

  const [messageType, setMessageType] = useState<
    "success" | "error" | "info"
  >("info");

  /*
   * Prevent duplicate payment verification.
   *
   * React development mode / Strict Mode can run
   * effects more than once.
   */
  const verificationStartedRef = useRef<string | null>(null);

  // =====================================
  // LOAD LICENSE
  // =====================================

  async function loadLicense() {
    try {
      setLoading(true);

      const response = await fetch("/api/license", {
        cache: "no-store",
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to load license."
        );
      }

      setData(result);

      if (result.license?.type) {
        setSelectedType(result.license.type);
      }

      return result;
    } catch (error) {
      console.error("License Load Error:", error);

      setMessageType("error");

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to load license."
      );

      return null;
    } finally {
      setLoading(false);
    }
  }

  // =====================================
  // VERIFY SAFEPAY PAYMENT
  // =====================================

  async function verifyPayment(orderId: string) {
    console.log("=================================");
    console.log("VERIFYING SAFEPAY PAYMENT");
    console.log("Order ID:", orderId);
    console.log("=================================");

    setVerifyingPayment(true);
    setMessageType("info");

    setMessage(
      "Payment received. Verifying your payment and activating your license..."
    );

    const maxAttempts = 15;

    for (
      let attempt = 1;
      attempt <= maxAttempts;
      attempt++
    ) {
      try {
        console.log(
          `Payment verification attempt ${attempt}/${maxAttempts}`
        );

        const statusUrl =
          `/api/payment/status?order_id=${encodeURIComponent(
            orderId
          )}`;

        console.log("Payment Status URL:", statusUrl);

        const response = await fetch(statusUrl, {
          cache: "no-store",
        });

        console.log(
          "Payment Status HTTP:",
          response.status
        );

        const result = await response.json();

        console.log(
          "Payment Status Response:",
          result
        );

        /*
         * Payment found
         */
        if (
          response.ok &&
          result.success &&
          result.payment
        ) {
          const paymentStatus = String(
            result.payment.status || ""
          ).toUpperCase();

          console.log(
            "CURRENT PAYMENT STATUS:",
            paymentStatus
          );

          // =====================================
          // PAID
          // =====================================

          if (paymentStatus === "PAID") {
            console.log(
              "PAYMENT CONFIRMED AS PAID"
            );

            setMessageType("success");

            setMessage(
              "Payment successful! Your HAK MRS POS license has been activated."
            );

            if (result.license) {
              setData({
                active:
                  result.license.status === "ACTIVE",
                license: result.license,
                message:
                  "License activated successfully.",
              });

              setSelectedType(
                result.license.type
              );
            } else {
              console.log(
                "License missing from payment response. Reloading license..."
              );

              await loadLicense();
            }

            setVerifyingPayment(false);
            setProcessing(false);

            /*
             * Remove payment parameters
             * after successful verification.
             */
            window.history.replaceState(
              {},
              "",
              "/settings/license"
            );

            return;
          }

          // =====================================
          // FAILED
          // =====================================

          if (paymentStatus === "FAILED") {
            console.log(
              "PAYMENT CONFIRMED AS FAILED"
            );

            setMessageType("error");

            setMessage(
              "Payment failed. Your license has not been activated."
            );

            setVerifyingPayment(false);
            setProcessing(false);

            window.history.replaceState(
              {},
              "",
              "/settings/license"
            );

            return;
          }

          // =====================================
          // REFUNDED
          // =====================================

          if (paymentStatus === "REFUNDED") {
            console.log(
              "PAYMENT CONFIRMED AS REFUNDED"
            );

            setMessageType("error");

            setMessage(
              "This payment was refunded. Your license has not been activated."
            );

            setVerifyingPayment(false);
            setProcessing(false);

            window.history.replaceState(
              {},
              "",
              "/settings/license"
            );

            return;
          }

          // =====================================
          // PENDING
          // =====================================

          if (paymentStatus === "PENDING") {
            console.log(
              "PAYMENT STILL PENDING"
            );

            setMessage(
              `Payment received. Waiting for confirmation... (${attempt}/${maxAttempts})`
            );
          }
        } else {
          console.log(
            "Payment record not ready yet."
          );

          setMessage(
            `Waiting for payment confirmation... (${attempt}/${maxAttempts})`
          );
        }
      } catch (error) {
        console.error(
          "Payment Verification Error:",
          error
        );

        setMessage(
          `Checking payment confirmation... (${attempt}/${maxAttempts})`
        );
      }

      /*
       * Wait 2 seconds before next check.
       */
      if (attempt < maxAttempts) {
        await new Promise((resolve) =>
          setTimeout(resolve, 2000)
        );
      }
    }

    // =====================================
    // VERIFICATION TIMEOUT
    // =====================================

    console.log(
      "Payment verification window completed."
    );

    setVerifyingPayment(false);
    setProcessing(false);

    setMessageType("info");

    setMessage(
      "Your payment is still being verified. Please wait a moment and refresh this page if your license does not update."
    );

    await loadLicense();
  }

  // =====================================
  // INITIAL PAGE LOAD + PAYMENT RETURN
  // =====================================

  useEffect(() => {
    let cancelled = false;

    async function initializePage() {
      try {
        /*
         * First check URL.
         *
         * Safepay now returns:
         *
         * /settings/license?order_id=PAY-...&tracker=...
         */
        const params = new URLSearchParams(
          window.location.search
        );

        const orderId = params.get("order_id");

        console.log(
          "================================="
        );

        console.log(
          "LICENSE PAGE INITIALIZING"
        );

        console.log(
          "Current URL:",
          window.location.href
        );

        console.log(
          "Safepay Order ID:",
          orderId
        );

        console.log(
          "================================="
        );

        /*
         * Load current license information.
         */
        const response = await fetch(
          "/api/license",
          {
            cache: "no-store",
          }
        );

        const result = await response.json();

        if (cancelled) {
          return;
        }

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Failed to load license."
          );
        }

        setData(result);

        if (result.license?.type) {
          setSelectedType(
            result.license.type
          );
        }

        setLoading(false);

        /*
         * If Safepay returned with order_id,
         * start payment verification.
         */
        if (orderId) {
          /*
           * Prevent duplicate verification.
           */
          if (
            verificationStartedRef.current ===
            orderId
          ) {
            console.log(
              "Payment verification already started for:",
              orderId
            );

            return;
          }

          verificationStartedRef.current =
            orderId;

          console.log(
            "Starting Safepay payment verification for:",
            orderId
          );

          /*
           * Start after the current render.
           */
          window.setTimeout(() => {
            if (!cancelled) {
              verifyPayment(orderId);
            }
          }, 100);
        }
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "License Page Initialization Error:",
          error
        );

        setMessageType("error");

        setMessage(
          error instanceof Error
            ? error.message
            : "Failed to load license."
        );

        setLoading(false);
      }
    }

    initializePage();

    return () => {
      cancelled = true;
    };
  }, []);

  // =====================================
  // PLAN ACTION
  // =====================================

  async function handlePlanAction() {
    console.log("=================================");
    console.log("PAY NOW / PLAN BUTTON CLICKED");
    console.log("Selected Plan:", selectedType);
    console.log("=================================");

    setMessage("");
    setProcessing(true);

    try {
      // =====================================
      // FREE TRIAL
      // =====================================

      if (selectedType === "TRIAL") {
        setMessageType("info");

        setMessage(
          "Starting your 7-day free trial..."
        );

        console.log(
          "Calling /api/license for TRIAL..."
        );

        const response = await fetch(
          "/api/license",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              type: "TRIAL",
            }),
          }
        );

        console.log(
          "Trial API Status:",
          response.status
        );

        const result =
          await response.json();

        console.log(
          "Trial API Response:",
          result
        );

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Failed to start free trial."
          );
        }

        if (!result.success) {
          throw new Error(
            result.message ||
              "Free trial could not be activated."
          );
        }

        setData({
          active: true,
          license: result.license,
          message: result.message,
        });

        setMessageType("success");

        setMessage(
          result.message ||
            "7-day free trial activated successfully."
        );

        setProcessing(false);

        return;
      }

      // =====================================
      // PAID PLAN
      // =====================================

      setMessageType("info");

      setMessage(
        "Creating secure Safepay checkout..."
      );

      console.log(
        "Calling /api/payment/create..."
      );

      console.log(
        "Payment Plan:",
        selectedType
      );

      const response = await fetch(
        "/api/payment/create",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            plan: selectedType,
          }),
        }
      );

      console.log(
        "Payment API Status:",
        response.status
      );

      const result =
        await response.json();

      console.log(
        "Payment API Response:",
        result
      );

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Failed to create payment order."
        );
      }

      if (!result.success) {
        throw new Error(
          result.message ||
            "Payment order could not be created."
        );
      }

      if (!result.checkoutUrl) {
        throw new Error(
          "Safepay checkout URL was not returned."
        );
      }

      console.log(
        "Payment order created successfully:",
        result.payment
      );

      console.log(
        "Safepay Checkout URL:",
        result.checkoutUrl
      );

      setMessageType("info");

      setMessage(
        "Redirecting to secure Safepay checkout..."
      );

      /*
       * Safepay handles the redirect.
       */
      window.location.href =
        result.checkoutUrl;
    } catch (error) {
      console.error(
        "License Payment Error:",
        error
      );

      setMessageType("error");

      setMessage(
        error instanceof Error
          ? error.message
          : "Failed to process payment."
      );

      setProcessing(false);
    }
  }

  // =====================================
  // DATE FORMAT
  // =====================================

  function formatDate(
    date: string | null
  ) {
    if (!date) {
      return "Never";
    }

    return new Date(
      date
    ).toLocaleString();
  }

  // =====================================
  // STATUS CLASS
  // =====================================

  function getStatusClass() {
    if (!data?.license) {
      return "bg-gray-100 text-gray-700";
    }

    if (
      data.active &&
      data.license.status === "ACTIVE"
    ) {
      return "bg-green-100 text-green-700";
    }

    if (
      data.license.status === "EXPIRED"
    ) {
      return "bg-red-100 text-red-700";
    }

    return "bg-yellow-100 text-yellow-700";
  }

  // =====================================
  // BUTTON TEXT
  // =====================================

  function getButtonText() {
    if (
      processing ||
      verifyingPayment
    ) {
      return selectedType === "TRIAL"
        ? "Starting Trial..."
        : "Processing...";
    }

    if (selectedType === "TRIAL") {
      return "Start 7-Day Free Trial";
    }

    return "Pay Now";
  }

  // =====================================
  // PAYMENT VERIFICATION SCREEN
  // =====================================

  if (verifyingPayment) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />

        <main className="flex flex-1 items-center justify-center p-6">
          <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
            <div className="mx-auto mb-6 h-14 w-14 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />

            <h1 className="text-xl font-bold text-gray-900">
              Verifying Payment
            </h1>

            <p className="mt-3 text-sm leading-6 text-gray-500">
              Your payment was received.
              We are confirming the
              transaction and activating
              your HAK MRS POS license.
            </p>

            <div className="mt-6 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
              Please do not close this page.
            </div>
          </div>
        </main>
      </div>
    );
  }

  // =====================================
  // LOADING SCREEN
  // =====================================

  if (loading) {
    return (
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />

        <main className="flex-1 p-4 md:p-8">
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <p className="text-gray-600">
              Loading license information...
            </p>
          </div>
        </main>
      </div>
    );
  }

  // =====================================
  // MAIN PAGE
  // =====================================

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 md:flex-row">
      <Sidebar />

      <main className="flex-1 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          {/* HEADER */}

          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              License & Activation
            </h1>

            <p className="mt-1 text-sm text-gray-500">
              Manage your HAK MRS POS license,
              trial and subscription plans.
            </p>
          </div>

          {/* MESSAGE */}

          {message && (
            <div
              className={`mb-6 rounded-lg border px-4 py-3 text-sm ${
                messageType === "success"
                  ? "border-green-200 bg-green-50 text-green-700"
                  : messageType === "error"
                  ? "border-red-200 bg-red-50 text-red-700"
                  : "border-blue-200 bg-blue-50 text-blue-700"
              }`}
            >
              {message}
            </div>
          )}

          <div className="space-y-6">
            {/* CURRENT LICENSE */}

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Current License
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  View your current HAK MRS POS
                  license information.
                </p>
              </div>

              {data?.license ? (
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Status
                    </p>

                    <span
                      className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getStatusClass()}`}
                    >
                      {data.license.status}
                    </span>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      License Type
                    </p>

                    <p className="mt-1 font-semibold text-gray-900">
                      {data.license.type}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4 md:col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      License Key
                    </p>

                    <p className="mt-2 break-all rounded-md border bg-white px-3 py-2 font-mono text-sm font-semibold text-gray-900">
                      {data.license.licenseKey}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Activated At
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {formatDate(
                        data.license.activatedAt
                      )}
                    </p>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                      Expiry Date
                    </p>

                    <p className="mt-1 font-medium text-gray-900">
                      {formatDate(
                        data.license.expiresAt
                      )}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-5">
                  <p className="font-semibold text-yellow-800">
                    No License Activated
                  </p>

                  <p className="mt-1 text-sm text-yellow-700">
                    Start your free 7-day trial
                    or choose a paid plan below.
                  </p>
                </div>
              )}
            </section>

            {/* PLANS */}

            <section className="rounded-xl bg-white p-6 shadow-sm">
              <div className="mb-6">
                <h2 className="text-lg font-semibold text-gray-900">
                  Choose Your License Plan
                </h2>

                <p className="mt-1 text-sm text-gray-500">
                  Select the plan that best fits
                  your business needs.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-4">
                {licenseTypes.map(
                  (license) => {
                    const selected =
                      selectedType ===
                      license.type;

                    return (
                      <button
                        key={license.type}
                        type="button"
                        onClick={() => {
                          setSelectedType(
                            license.type
                          );

                          setMessage("");
                        }}
                        className={`relative rounded-xl border-2 p-5 text-left transition ${
                          selected
                            ? "border-blue-600 bg-blue-50 shadow-sm"
                            : "border-gray-200 bg-white hover:border-blue-300"
                        }`}
                      >
                        {license.type ===
                          "YEARLY" && (
                          <span className="absolute right-3 top-3 rounded-full bg-blue-600 px-2 py-1 text-[10px] font-bold text-white">
                            POPULAR
                          </span>
                        )}

                        <div className="mb-4">
                          <h3 className="font-semibold text-gray-900">
                            {license.name}
                          </h3>

                          <p className="mt-1 min-h-[40px] text-sm text-gray-500">
                            {license.description}
                          </p>
                        </div>

                        <div className="mb-4">
                          <span className="text-2xl font-bold text-gray-900">
                            {license.price}
                          </span>

                          {license.period && (
                            <span className="ml-1 text-xs text-gray-500">
                              {license.period}
                            </span>
                          )}
                        </div>

                        <ul className="space-y-2 text-sm text-gray-600">
                          {license.features.map(
                            (feature) => (
                              <li
                                key={feature}
                                className="flex gap-2"
                              >
                                <span className="font-semibold text-green-600">
                                  ✓
                                </span>

                                <span>
                                  {feature}
                                </span>
                              </li>
                            )
                          )}
                        </ul>

                        <div className="mt-5 flex items-center gap-2">
                          <div
                            className={`h-5 w-5 rounded-full border-2 ${
                              selected
                                ? "border-blue-600 bg-blue-600"
                                : "border-gray-300"
                            }`}
                          >
                            {selected && (
                              <div className="m-1 h-1.5 w-1.5 rounded-full bg-white" />
                            )}
                          </div>

                          <span className="text-xs font-medium text-gray-600">
                            {selected
                              ? "Selected"
                              : "Select Plan"}
                          </span>
                        </div>
                      </button>
                    );
                  }
                )}
              </div>

              {/* ACTION */}

              <div className="mt-6 flex flex-col items-stretch gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-900">
                    Selected:{" "}
                    {
                      licenseTypes.find(
                        (item) =>
                          item.type ===
                          selectedType
                      )?.name
                    }
                  </p>

                  <p className="mt-1 text-xs text-gray-500">
                    {selectedType ===
                    "TRIAL"
                      ? "No payment is required for the free trial."
                      : "Payment is required before this license can be activated."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handlePlanAction
                  }
                  disabled={
                    processing ||
                    verifyingPayment
                  }
                  className="rounded-lg bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {getButtonText()}
                </button>
              </div>
            </section>

            {/* RENEWAL */}

            {data?.license &&
              data.license.type !==
                "TRIAL" && (
                <section className="rounded-xl border border-purple-100 bg-purple-50 p-6">
                  <h2 className="text-sm font-semibold text-purple-900">
                    License Renewal
                  </h2>

                  <p className="mt-2 text-sm text-purple-800">
                    Your license can be renewed
                    using the same license key.
                    Renewal will extend the
                    current license period.
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedType(
                        data.license?.type ||
                          "MONTHLY"
                      );

                      setMessageType(
                        "info"
                      );

                      setMessage(
                        "Select your plan and continue with Pay Now to renew your license."
                      );
                    }}
                    className="mt-4 rounded-lg border border-purple-300 bg-white px-5 py-2.5 text-sm font-semibold text-purple-700 hover:bg-purple-100"
                  >
                    Renew License
                  </button>
                </section>
              )}

            {/* INFORMATION */}

            <section className="rounded-xl border border-blue-100 bg-blue-50 p-6">
              <h2 className="text-sm font-semibold text-blue-900">
                License Information
              </h2>

              <ul className="mt-3 space-y-2 text-sm text-blue-800">
                <li>
                  • 7-day free trial is available
                  once per installation.
                </li>

                <li>
                  • Monthly license is valid for
                  30 days.
                </li>

                <li>
                  • Yearly license is valid for
                  365 days.
                </li>

                <li>
                  • Lifetime license has no
                  expiry date.
                </li>

                <li>
                  • One license is intended for
                  one POS installation.
                </li>

                <li>
                  • License renewal keeps the
                  same license key.
                </li>

                <li>
                  • Paid licenses require
                  verified payment before
                  activation.
                </li>
              </ul>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}