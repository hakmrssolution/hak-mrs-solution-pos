import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveLicense } from "@/lib/license";

export async function GET() {
  try {
    const licenseActive = await requireActiveLicense();

    if (!licenseActive) {
      return NextResponse.json(
        {
          message: "Active license required.",
        },
        { status: 403 }
      );
    }

    const suppliers = await prisma.supplier.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(suppliers);
  } catch (error) {
    console.error("Suppliers GET Error:", error);

    return NextResponse.json(
      {
        message: "Failed to load suppliers",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const licenseActive = await requireActiveLicense();

    if (!licenseActive) {
      return NextResponse.json(
        {
          message: "Active license required.",
        },
        { status: 403 }
      );
    }

    const body = await request.json();

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          message: "Supplier name is required",
        },
        { status: 400 }
      );
    }

    let business = await prisma.business.findFirst();

    if (!business) {
      business = await prisma.business.create({
        data: {
          name: "My Retail Store",
        },
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        phone: phone || null,
        address: address || null,
        business: {
          connect: {
            id: business.id,
          },
        },
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  } catch (error) {
    console.error("Supplier POST Error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create supplier",
      },
      { status: 500 }
    );
  }
}