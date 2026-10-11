import { prisma } from "@/lib/prisma";
import { requireActiveLicense } from "@/lib/license";
import { NextResponse } from "next/server";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: Request,
  { params }: RouteContext
) {
  try {
    const licenseActive = await requireActiveLicense();

    if (!licenseActive) {
      return NextResponse.json(
        { message: "Active license required." },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();

    const quantity = Number(body.quantity);
    const type = body.type;
    const reason = body.reason?.trim() || null;

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { message: "Quantity must be greater than 0" },
        { status: 400 }
      );
    }

    if (type !== "IN" && type !== "OUT") {
      return NextResponse.json(
        { message: "Stock type must be IN or OUT" },
        { status: 400 }
      );
    }

    const product = await prisma.product.findUnique({
      where: {
        id,
      },
    });

    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }

    if (type === "OUT" && product.stock < quantity) {
      return NextResponse.json(
        {
          message: `Insufficient stock. Available stock: ${product.stock}`,
        },
        { status: 400 }
      );
    }

    const newStock =
      type === "IN"
        ? product.stock + quantity
        : product.stock - quantity;

    const result = await prisma.$transaction(async (tx) => {
      const updatedProduct = await tx.product.update({
        where: {
          id,
        },
        data: {
          stock: newStock,
        },
      });

      const movement = await tx.stockMovement.create({
        data: {
          type,
          quantity,
          reason,
          product: {
            connect: {
              id,
            },
          },
        },
      });

      return {
        product: updatedProduct,
        movement,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Stock Adjustment Error:", error);

    return NextResponse.json(
      { message: "Failed to adjust stock" },
      { status: 500 }
    );
  }
}