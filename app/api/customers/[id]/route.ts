import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveLicense } from "@/lib/license";

export async function PUT(
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
    const body = await request.json();

    const name = String(body.name || "").trim();
    const phone = String(body.phone || "").trim();
    const address = String(body.address || "").trim();

    if (!name) {
      return NextResponse.json(
        {
          message: "Customer name is required",
        },
        {
          status: 400,
        }
      );
    }

    const customer = await prisma.customer.update({
      where: {
        id,
      },
      data: {
        name,
        phone: phone || null,
        address: address || null,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Customer PUT Error:", error);

    return NextResponse.json(
      {
        message: "Failed to update customer",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(
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

    const customer = await prisma.customer.findUnique({
      where: {
        id,
      },
      include: {
        sales: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          message: "Customer not found",
        },
        {
          status: 404,
        }
      );
    }

    if (customer.sales.length > 0) {
      return NextResponse.json(
        {
          message:
            "This customer has sales history and cannot be deleted.",
        },
        {
          status: 400,
        }
      );
    }

    await prisma.customer.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Customer DELETE Error:", error);

    return NextResponse.json(
      {
        message: "Failed to delete customer",
      },
      {
        status: 500,
      }
    );
  }
}