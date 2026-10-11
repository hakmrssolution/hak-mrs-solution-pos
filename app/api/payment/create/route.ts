
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { Safepay } from "@sfpy/node-sdk";

const ALLOWED_PLANS = [
  "MONTHLY",
  "YEARLY",
  "LIFETIME",
] as const;

type PaidPlan = (typeof ALLOWED_PLANS)[number];

const PLAN_PRICES: Record<PaidPlan, number> = {
  MONTHLY: 2500,
  YEARLY: 20000,
  LIFETIME: 50000,
};

const CURRENCY = "PKR";
const GATEWAY = "SAFEPAY";

function getSafepayClient() {
  const apiKey = process.env.SAFEPAY_API_KEY;
  const v1Secret = process.env.SAFEPAY_V1_SECRET;
  const webhookSecret =
    process.env.SAFEPAY_WEBHOOK_SECRET;

  if (!apiKey) {
    throw new Error(
      "SAFEPAY_API_KEY is missing."
    );
  }

  if (!v1Secret) {
    throw new Error(
      "SAFEPAY_V1_SECRET is missing."
    );
  }

  if (!webhookSecret) {
    throw new Error(
      "SAFEPAY_WEBHOOK_SECRET is missing."
    );
  }

  return new Safepay({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  environment: process.env.SAFEPAY_ENVIRONMENT as any,
  apiKey,
  v1Secret,
  webhookSecret,
});
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const plan = String(
      body.plan || ""
    ).toUpperCase() as PaidPlan;

    if (!ALLOWED_PLANS.includes(plan)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid payment plan.",
        },
        { status: 400 }
      );
    }

    const business =
      await prisma.business.findFirst();

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          message: "Business not found.",
        },
        { status: 404 }
      );
    }

    const amount = PLAN_PRICES[plan];

    const license =
      await prisma.license.findUnique({
        where: {
          businessId: business.id,
        },
      });

    const transactionId =
      `PAY-${randomUUID()}`;

    // Create our local payment record first.
    const payment =
      await prisma.payment.create({
        data: {
          amount,
          plan,
          status: "PENDING",
          gateway: GATEWAY,
          transactionId,
          businessId: business.id,
          licenseId: license?.id || null,
        },
      });

    const safepay =
      getSafepayClient();

    // Create Safepay payment tracker/token.
    const paymentResponse =
      await safepay.payments.create({
        amount,
        currency: CURRENCY,
      });

    const token =
      paymentResponse.token;

    if (!token) {
      throw new Error(
        "Safepay did not return a payment token."
      );
    }

    const baseUrl =
  process.env.NEXT_PUBLIC_APP_URL ||
  "http://localhost:3000";

const returnUrl = new URL(
  "/settings/license",
  baseUrl
);


const checkoutUrl = safepay.checkout.create({
  token,
  orderId: transactionId,
  cancelUrl: returnUrl.toString(),
  redirectUrl: returnUrl.toString(),
  source: "custom",
  webhooks: true,
});
    return NextResponse.json({
      success: true,

      payment: {
        id: payment.id,
        transactionId:
          payment.transactionId,
        amount: payment.amount,
        currency: CURRENCY,
        plan: payment.plan,
        status: payment.status,
        gateway: payment.gateway,
      },

      checkoutUrl,

      message:
        "Safepay checkout created successfully.",
    });
  } catch (error) {
    console.error(
      "Payment Create Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to create Safepay checkout.",
      },
      { status: 500 }
    );
  }
}
