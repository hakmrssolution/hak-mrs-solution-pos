import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireActiveLicense } from "@/lib/license";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(
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

    const product = await prisma.product.update({
      where: { id },
      data: {
        name: body.name,
        sku: body.sku || null,
        barcode: body.barcode || null,
        price: Number(body.price),
        costPrice: Number(body.costPrice),
        stock: Number(body.stock || 0),
        minStock: Number(body.minStock || 5),
      },
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Product UPDATE Error:", error);

    return NextResponse.json(
      { message: "Failed to update product" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const product = await prisma.product.update({
      where: { id },
      data: {
        isActive: false,
      },
    });

    return NextResponse.json({
      message: "Product deactivated successfully",
      product,
    });
  } catch (error) {
    console.error("Product DEACTIVATE Error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to deactivate product",
      },
      { status: 500 }
    );
  }
}
export async function PATCH(
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

    const product = await prisma.product.update({
      where: { id },
      data: {
        isActive: true,
      },
    });

    return NextResponse.json({
      message: "Product restored successfully",
      product,
    });
  } catch (error) {
    console.error("Product RESTORE Error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to restore product",
      },
      { status: 500 }
    );
  }
}