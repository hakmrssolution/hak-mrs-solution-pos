import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { requireActiveLicense } from "@/lib/license";

export async function GET() {
  try {
    const licenseActive = await requireActiveLicense();

    if (!licenseActive) {
      return NextResponse.json(
        { message: "Active license required." },
        { status: 403 }
      );
    }

    const categories = await prisma.category.findMany({
      orderBy: {
        name: "asc",
      },
    });

    return NextResponse.json(categories);
  } catch (error) {
    console.error("Categories GET Error:", error);

    return NextResponse.json(
      { message: "Failed to load categories" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const licenseActive = await requireActiveLicense();

    if (!licenseActive) {
      return NextResponse.json(
        { message: "Active license required." },
        { status: 403 }
      );
    }

    const body = await request.json();

    if (!body.name) {
      return NextResponse.json(
        { message: "Category name is required" },
        { status: 400 }
      );
    }

    let business = await prisma.business.findFirst();

    if (!business) {
      business = await prisma.business.create({
        data: {
          name: "HAK MRS Solution",
        },
      });
    }

    const category = await prisma.category.create({
      data: {
        name: body.name,
        business: {
          connect: {
            id: business.id,
          },
        },
      },
    });

    return NextResponse.json(category, { status: 201 });
  } catch (error) {
    console.error("Categories POST Error:", error);

    return NextResponse.json(
      { message: "Failed to create category" },
      { status: 500 }
    );
  }
}