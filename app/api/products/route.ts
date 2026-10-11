import { prisma } from "@/lib/prisma";
import { requireActiveLicense } from "@/lib/license";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);

const includeInactive =
  searchParams.get("includeInactive") === "true";

const inactiveOnly =
  searchParams.get("inactiveOnly") === "true";

const products = await prisma.product.findMany({
  where: inactiveOnly
    ? {
        isActive: false,
      }
    : includeInactive
    ? {}
    : {
        isActive: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(products);
  } catch (error) {
    console.error("Products GET Error:", error);

    return NextResponse.json(
      { message: "Failed to load products" },
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

    let business = await prisma.business.findFirst();

    if (!business) {
      business = await prisma.business.create({
        data: {
          name: "HAK MRS Solution",
        },
      });
    }

    const product = await prisma.product.create({
      data: {
        name: body.name,
        sku: body.sku || null,
        barcode: body.barcode || null,
        price: Number(body.price),
        costPrice: Number(body.costPrice),
        stock: Number(body.stock || 0),
        minStock: Number(body.minStock || 5),

        category: body.categoryId
          ? {
              connect: {
                id: body.categoryId,
              },
            }
          : undefined,

        business: {
          connect: {
            id: business.id,
          },
        },
      },
      include: {
        category: true,
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error("Products POST Error:", error);

    return NextResponse.json(
      { message: "Failed to create product" },
      { status: 500 }
    );
  }
}