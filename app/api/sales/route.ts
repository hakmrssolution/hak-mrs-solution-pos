
import { prisma } from "@/lib/prisma";
import { requireActiveLicense } from "@/lib/license";
import { NextResponse } from "next/server";

export async function GET() {
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

    const sales = await prisma.sale.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        customer: true,
      },
    });

    return NextResponse.json(sales);
  } catch (error) {
    console.error("Sales GET Error:", error);

    return NextResponse.json(
      {
        message: "Failed to load sales",
      },
      {
        status: 500,
      }
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
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const items = body.items;
    const customerId = body.customerId || null;

    // Payment information
    const paymentMethod = body.paymentMethod || "CASH";
    const paidAmount = Number(body.paidAmount || 0);

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "Sale items are required" },
        { status: 400 }
      );
    }

    if (paidAmount < 0) {
      return NextResponse.json(
        { message: "Paid amount cannot be negative" },
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

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0;

      const saleItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
        });

        if (!product) {
          throw new Error(`Product not found: ${item.productId}`);
        }

        const quantity = Number(item.quantity);

        if (!quantity || quantity <= 0) {
          throw new Error("Invalid quantity");
        }

        if (product.stock < quantity) {
          throw new Error(
            `Insufficient stock for ${product.name}. Available stock: ${product.stock}`
          );
        }

        const itemTotal = product.price * quantity;

        subtotal += itemTotal;

        saleItemsData.push({
          productId: product.id,
          quantity,
          price: product.price,
          total: itemTotal,
        });
      }

      const discount = Number(body.discount || 0);
      const total = subtotal - discount;

      // Calculate due amount
      const dueAmount = Math.max(total - paidAmount, 0);

      const sale = await tx.sale.create({
        data: {
          subtotal,
          discount,
          total,

          // Payment information
          paymentMethod,
          paidAmount,
          dueAmount,

          business: {
            connect: {
              id: business.id,
            },
          },

          customer: customerId
            ? {
                connect: {
                  id: customerId,
                },
              }
            : undefined,

          items: {
            create: saleItemsData,
          },
        },

        include: {
          items: true,
        },
      });

      for (const item of items) {
        const quantity = Number(item.quantity);

        const product = await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              decrement: quantity,
            },
          },
        });

        await tx.stockMovement.create({
          data: {
            type: "OUT",
            quantity,
            reason: `Sale #${sale.id}`,
            product: {
              connect: {
                id: product.id,
              },
            },
          },
        });
      }

      return sale;
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Sale Creation Error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create sale",
      },
      { status: 500 }
    );
  }
}
