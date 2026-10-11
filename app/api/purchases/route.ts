
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
        {
          status: 403,
        }
      );
    }

    const purchases = await prisma.purchase.findMany({
      orderBy: {
        createdAt: "desc",
      },
      include: {
        supplier: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json(purchases);
  } catch (error) {
    console.error("Purchases GET Error:", error);

    return NextResponse.json(
      {
        message: "Failed to load purchases",
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
    const supplierId = body.supplierId || null;

    // Supplier is required
    if (!supplierId) {
      return NextResponse.json(
        {
          message:
            "Supplier is required before completing the purchase.",
        },
        {
          status: 400,
        }
      );
    }

    // Purchase items are required
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        {
          message: "Purchase items are required.",
        },
        {
          status: 400,
        }
      );
    }

    // Check supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        {
          message: "Selected supplier was not found.",
        },
        {
          status: 400,
        }
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

    const result = await prisma.$transaction(async (tx) => {
      let subtotal = 0;

      const purchaseItemsData = [];

      for (const item of items) {
        const product = await tx.product.findUnique({
          where: {
            id: item.productId,
          },
        });

        if (!product) {
          throw new Error(
            `Product not found: ${item.productId}`
          );
        }

        const quantity = Number(item.quantity);
        const costPrice = Number(item.costPrice);

        if (
          !Number.isFinite(quantity) ||
          quantity <= 0
        ) {
          throw new Error(
            `Invalid quantity for ${product.name}`
          );
        }

        if (!Number.isInteger(quantity)) {
          throw new Error(
            `Quantity must be a whole number for ${product.name}`
          );
        }

        if (
          !Number.isFinite(costPrice) ||
          costPrice < 0
        ) {
          throw new Error(
            `Invalid cost price for ${product.name}`
          );
        }

        const itemTotal = costPrice * quantity;

        subtotal += itemTotal;

        purchaseItemsData.push({
          productId: product.id,
          quantity,
          costPrice,
        });
      }

      const discount = Number(body.discount || 0);
      const tax = Number(body.tax || 0);
      const paidAmount = Number(body.paidAmount || 0);

      const total = subtotal - discount + tax;

      if (
        !Number.isFinite(discount) ||
        !Number.isFinite(tax) ||
        !Number.isFinite(paidAmount)
      ) {
        throw new Error(
          "Invalid purchase amount."
        );
      }

      if (discount < 0 || tax < 0 || paidAmount < 0) {
        throw new Error(
          "Discount, tax and paid amount cannot be negative."
        );
      }

      if (discount > subtotal) {
        throw new Error(
          "Discount cannot be greater than subtotal."
        );
      }

      if (paidAmount <= 0) {
  throw new Error(
    "Paid amount is required before completing the purchase."
  );
}

if (paidAmount > total) {
  throw new Error(
    "Paid amount cannot be greater than total."
  );
}

      const purchase = await tx.purchase.create({
        data: {
          invoiceNo: body.invoiceNo
            ? String(body.invoiceNo).trim()
            : null,

          subtotal,
          discount,
          tax,
          total,
          paidAmount,

          business: {
            connect: {
              id: business.id,
            },
          },

          supplier: {
            connect: {
              id: supplierId,
            },
          },

          items: {
            create: purchaseItemsData,
          },
        },

        include: {
          items: {
            include: {
              product: true,
            },
          },
          supplier: true,
        },
      });

      // Increase stock and create stock movements
      for (const item of items) {
        const quantity = Number(item.quantity);
        const costPrice = Number(item.costPrice);

        const product = await tx.product.update({
          where: {
            id: item.productId,
          },
          data: {
            stock: {
              increment: quantity,
            },
            costPrice,
          },
        });

        await tx.stockMovement.create({
          data: {
            type: "IN",
            quantity,
            reason: `Purchase #${purchase.id}`,
            product: {
              connect: {
                id: product.id,
              },
            },
          },
        });
      }

      return purchase;
    });

    return NextResponse.json(result, {
      status: 201,
    });
  } catch (error) {
    console.error("Purchase POST Error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create purchase",
      },
      {
        status: 500,
      }
    );
  }
}
