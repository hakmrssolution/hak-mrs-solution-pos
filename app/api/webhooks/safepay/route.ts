import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/prisma";

const MONTHLY_DAYS = 30;
const YEARLY_DAYS = 365;

function generateLicenseKey() {
  const part = () =>
    crypto
      .randomBytes(4)
      .toString("hex")
      .toUpperCase();

  return `HAK-${part()}-${part()}-${part()}`;
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export async function POST(request: Request) {
  try {
    console.log("=================================");
    console.log("SAFE PAY WEBHOOK RECEIVED");
    console.log("=================================");

    const webhookSecret =
      process.env.SAFEPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error(
        "SAFEPAY_WEBHOOK_SECRET is missing."
      );

      return NextResponse.json(
        {
          success: false,
          message: "Webhook secret is missing.",
        },
        { status: 500 }
      );
    }

    const signature =
      request.headers.get("x-sfpy-signature");

    if (!signature) {
      console.error(
        "Missing X-SFPY-SIGNATURE header."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Missing Safepay signature.",
        },
        { status: 401 }
      );
    }

    /*
     * IMPORTANT:
     * Read raw body BEFORE parsing JSON.
     */
    const rawBody = await request.text();

    console.log(
      "Webhook signature received."
    );

    const expectedSignature = crypto
      .createHmac("sha512", webhookSecret)
      .update(rawBody, "utf8")
      .digest("hex");

    const signatureBuffer =
      Buffer.from(signature, "utf8");

    const expectedBuffer =
      Buffer.from(expectedSignature, "utf8");

    let valid = false;

    if (
      signatureBuffer.length ===
      expectedBuffer.length
    ) {
      valid = crypto.timingSafeEqual(
        signatureBuffer,
        expectedBuffer
      );
    }

    console.log(
      "Webhook signature valid:",
      valid
    );

    if (!valid) {
      console.error(
        "Invalid Safepay webhook signature."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Invalid webhook signature.",
        },
        { status: 401 }
      );
    }

    const body = JSON.parse(rawBody);

    console.log("=================================");
    console.log("SAFE PAY WEBHOOK BODY");
    console.log("=================================");
    console.log(
      JSON.stringify(body, null, 2)
    );
    console.log("=================================");

    /*
     * Safepay event type
     */
    const eventType = String(
      body?.type || ""
    ).toLowerCase();

    /*
     * Safepay payment data
     */
    const data = body?.data || {};

    /*
     * Our transaction ID is sent to Safepay
     * as metadata.order_id.
     */
    const orderId =
      data?.metadata?.order_id
        ? String(data.metadata.order_id)
        : "";

    const tracker =
      data?.tracker
        ? String(data.tracker)
        : null;

    const state =
      data?.state
        ? String(data.state)
        : null;

    console.log(
      "Safepay event:",
      eventType
    );

    console.log(
      "Safepay order ID:",
      orderId
    );

    console.log(
      "Safepay tracker:",
      tracker
    );

    console.log(
      "Safepay state:",
      state
    );

    /*
     * Ignore unknown events safely.
     */
    const allowedEvents = [
      "payment.succeeded",
      "payment.failed",
      "payment.refunded",
    ];

    if (!allowedEvents.includes(eventType)) {
      console.log(
        "Ignoring unsupported Safepay event:",
        eventType
      );

      return NextResponse.json({
        success: true,
        message:
          "Webhook received. Event ignored.",
      });
    }

    /*
     * Test events from Safepay may contain
     * dummy order IDs such as AX-09u812312.
     *
     * Only process payments that belong to
     * our local Payment table.
     */
    if (!orderId) {
      console.error(
        "No order_id found in Safepay webhook."
      );

      return NextResponse.json(
        {
          success: false,
          message:
            "Safepay order ID not found.",
        },
        { status: 400 }
      );
    }

    const payment =
      await prisma.payment.findUnique({
        where: {
          transactionId: orderId,
        },
        include: {
          license: true,
          business: true,
        },
      });

    /*
     * Safepay dashboard test event won't normally
     * match our local PAY-... transaction.
     *
     * Return 200 so Safepay does not keep retrying it.
     */
    if (!payment) {
      console.log(
        "No local payment found for order:",
        orderId
      );

      return NextResponse.json({
        success: true,
        message:
          "Webhook received. No matching local payment.",
      });
    }

    console.log(
      "Local payment found:",
      payment.id
    );

    /*
     * ==========================================
     * PAYMENT FAILED
     * ==========================================
     */
    if (eventType === "payment.failed") {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "FAILED",
          paymentReference:
            tracker || state || null,
        },
      });

      console.log(
        "Payment marked as FAILED:",
        payment.transactionId
      );

      return NextResponse.json({
        success: true,
        message:
          "Payment marked as failed.",
      });
    }

    /*
     * ==========================================
     * PAYMENT REFUNDED
     * ==========================================
     */
    if (eventType === "payment.refunded") {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          status: "REFUNDED",
          paymentReference:
            tracker || state || null,
        },
      });

      console.log(
        "Payment marked as REFUNDED:",
        payment.transactionId
      );

      return NextResponse.json({
        success: true,
        message:
          "Payment marked as refunded.",
      });
    }

    /*
     * ==========================================
     * PAYMENT SUCCEEDED
     * ==========================================
     */

    /*
     * Idempotency:
     * If Safepay sends the same successful webhook
     * more than once, don't extend the license again.
     */
    if (payment.status === "PAID") {
      console.log(
        "Payment already processed:",
        payment.transactionId
      );

      return NextResponse.json({
        success: true,
        message:
          "Payment already processed.",
      });
    }

    const paidAt = new Date();

    /*
     * Mark payment as PAID first.
     */
    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "PAID",
        paidAt,
        paymentReference:
          tracker || state || null,
      },
    });

    /*
     * Find existing license for this business.
     */
    let license = payment.license;

    /*
     * If payment was created before a license existed,
     * create one now.
     */
    if (!license) {
      license =
        await prisma.license.findUnique({
          where: {
            businessId:
              payment.businessId,
          },
        });
    }

    /*
     * ==========================================
     * LICENSE EXPIRY
     * ==========================================
     */

    let expiresAt: Date | null = null;

    if (payment.plan === "MONTHLY") {
      /*
       * If current license is still active and
       * has an expiry date, extend from that date.
       *
       * Otherwise start from today.
       */
      const startDate =
        license?.expiresAt &&
        license.expiresAt > paidAt
          ? license.expiresAt
          : paidAt;

      expiresAt = addDays(
        startDate,
        MONTHLY_DAYS
      );
    }

    if (payment.plan === "YEARLY") {
      const startDate =
        license?.expiresAt &&
        license.expiresAt > paidAt
          ? license.expiresAt
          : paidAt;

      expiresAt = addDays(
        startDate,
        YEARLY_DAYS
      );
    }

    if (payment.plan === "LIFETIME") {
      expiresAt = null;
    }

    /*
     * ==========================================
     * CREATE / UPDATE LICENSE
     * ==========================================
     */

    if (license) {
      license =
        await prisma.license.update({
          where: {
            id: license.id,
          },
          data: {
            type: payment.plan,
            status: "ACTIVE",
            activatedAt:
              license.activatedAt ||
              paidAt,
            expiresAt,
            trialUsed: true,
            lastVerifiedAt: paidAt,
          },
        });
    } else {
      license =
        await prisma.license.create({
          data: {
            licenseKey:
              generateLicenseKey(),
            type: payment.plan,
            status: "ACTIVE",
            activatedAt: paidAt,
            expiresAt,
            trialUsed: true,
            lastVerifiedAt: paidAt,
            businessId:
              payment.businessId,
          },
        });
    }

    /*
     * Attach license to payment if it wasn't
     * already attached.
     */
    if (payment.licenseId !== license.id) {
      await prisma.payment.update({
        where: {
          id: payment.id,
        },
        data: {
          licenseId: license.id,
        },
      });
    }

    console.log(
      "================================="
    );
    console.log(
      "PAYMENT SUCCESSFULLY PROCESSED"
    );
    console.log(
      "Transaction:",
      payment.transactionId
    );
    console.log(
      "Plan:",
      payment.plan
    );
    console.log(
      "License:",
      license.licenseKey
    );
    console.log(
      "Expires:",
      license.expiresAt
    );
    console.log(
      "================================="
    );

    return NextResponse.json({
      success: true,
      message:
        "Payment and license processed successfully.",
      payment: {
        id: payment.id,
        transactionId:
          payment.transactionId,
        status: "PAID",
        plan: payment.plan,
      },
      license: {
        id: license.id,
        licenseKey:
          license.licenseKey,
        type: license.type,
        status: license.status,
        expiresAt:
          license.expiresAt,
      },
    });
  } catch (error) {
    console.error("=================================");
    console.error(
      "SAFE PAY WEBHOOK ERROR"
    );
    console.error("=================================");
    console.error(error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Webhook processing failed.",
      },
      { status: 500 }
    );
  }
}