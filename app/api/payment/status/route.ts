import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const orderId = searchParams.get("order_id");

    if (!orderId) {
      return NextResponse.json(
        {
          success: false,
          message: "order_id is required.",
        },
        { status: 400 }
      );
    }

    const payment = await prisma.payment.findUnique({
      where: {
        transactionId: orderId,
      },
      include: {
        license: true,
      },
    });

    if (!payment) {
      return NextResponse.json(
        {
          success: false,
          found: false,
          status: "NOT_FOUND",
          message: "Payment not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      found: true,

      payment: {
        id: payment.id,
        transactionId: payment.transactionId,
        amount: payment.amount,
        plan: payment.plan,
        status: payment.status,
        gateway: payment.gateway,
        paymentReference: payment.paymentReference,
        paidAt: payment.paidAt,
      },

      license: payment.license
        ? {
            id: payment.license.id,
            licenseKey: payment.license.licenseKey,
            type: payment.license.type,
            status: payment.license.status,
            expiresAt: payment.license.expiresAt,
          }
        : null,
    });
  } catch (error) {
    console.error("Payment Status Error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to check payment status.",
      },
      { status: 500 }
    );
  }
}