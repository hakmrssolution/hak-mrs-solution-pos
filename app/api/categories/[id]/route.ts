import { prisma } from "@/lib/prisma";
import { requireActiveLicense } from "@/lib/license";
import { NextResponse } from "next/server";

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

    if (!body.name?.trim()) {
      return NextResponse.json(
        { message: "Category name is required" },
        { status: 400 }
      );
    }

    const category = await prisma.category.update({
      where: {
        id,
      },
      data: {
        name: body.name.trim(),
      },
    });

    return NextResponse.json(category);
  } catch (error) {
    console.error("Category UPDATE Error:", error);

    return NextResponse.json(
      { message: "Failed to update category" },
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

    await prisma.category.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Category DELETE Error:", error);

    return NextResponse.json(
      {
        message:
          "Cannot delete category. It may be linked to products.",
      },
      { status: 500 }
    );
  }
}