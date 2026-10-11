import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveLicense } from "@/lib/license";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const licenseActive = await requireActiveLicense();

    if (!licenseActive) {
      return NextResponse.json(
        {
          message: "Active license required.",
        },
        {
          status: 403,
        }
      );
    }

    const { id } = await params;

    const sale = await prisma.sale.findUnique({
      where: {
        id,
      },
      include: {
        customer: true,
        business: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    if (!sale) {
      return NextResponse.json(
        {
          message: "Sale not found",
        },
        {
          status: 404,
        }
      );
    }

    return NextResponse.json(sale);
  } catch (error) {
    console.error("Sale Details GET Error:", error);

    return NextResponse.json(
      {
        message: "Failed to load sale details",
      },
      {
        status: 500,
      }
    );
  }
}