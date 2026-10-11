import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveLicense } from "@/lib/license";

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

    const from = searchParams.get("from");
    const to = searchParams.get("to");

    let dateFilter = {};

    if (from || to) {
      const createdAt: {
        gte?: Date;
        lt?: Date;
      } = {};

      if (from) {
        const fromDate = new Date(`${from}T00:00:00`);

        if (!Number.isNaN(fromDate.getTime())) {
          createdAt.gte = fromDate;
        }
      }

      if (to) {
        const toDate = new Date(`${to}T00:00:00`);

        if (!Number.isNaN(toDate.getTime())) {
          toDate.setDate(toDate.getDate() + 1);
          createdAt.lt = toDate;
        }
      }

      dateFilter = {
        createdAt,
      };
    }

    const [sales, purchases, expenses, products] =
      await Promise.all([
        prisma.sale.findMany({
          where: dateFilter,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        }),

        prisma.purchase.findMany({
          where: dateFilter,
          orderBy: {
            createdAt: "desc",
          },
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        }),

        prisma.expense.findMany({
          where: dateFilter,
          orderBy: {
            createdAt: "desc",
          },
        }),

        prisma.product.findMany({
          orderBy: {
            name: "asc",
          },
        }),
      ]);

    // -----------------------------
    // SALES
    // -----------------------------

    const totalSales = sales.reduce(
      (sum, sale) => sum + sale.total,
      0
    );

    // -----------------------------
    // COST OF GOODS SOLD
    // -----------------------------

    const costOfGoodsSold = sales.reduce(
      (saleSum, sale) =>
        saleSum +
        sale.items.reduce(
          (itemSum, item) =>
            itemSum + item.quantity * item.product.costPrice,
          0
        ),
      0
    );

    // -----------------------------
    // GROSS PROFIT
    // -----------------------------

    const grossProfit = totalSales - costOfGoodsSold;

    // -----------------------------
    // PURCHASES
    // -----------------------------

    const totalPurchases = purchases.reduce(
      (sum, purchase) => sum + purchase.total,
      0
    );

    // -----------------------------
    // EXPENSES
    // -----------------------------

    const totalExpenses = expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );

    // -----------------------------
    // NET PROFIT
    // -----------------------------

    const netProfit = grossProfit - totalExpenses;

    // -----------------------------
    // STOCK VALUES
    // -----------------------------

    const totalStockValue = products.reduce(
      (sum, product) =>
        sum + product.stock * product.costPrice,
      0
    );

    const totalRetailValue = products.reduce(
      (sum, product) =>
        sum + product.stock * product.price,
      0
    );

    // -----------------------------
    // ITEM COUNTS
    // -----------------------------

    const totalItemsSold = sales.reduce(
      (sum, sale) =>
        sum +
        sale.items.reduce(
          (itemSum, item) => itemSum + item.quantity,
          0
        ),
      0
    );

    const totalItemsPurchased = purchases.reduce(
      (sum, purchase) =>
        sum +
        purchase.items.reduce(
          (itemSum, item) => itemSum + item.quantity,
          0
        ),
      0
    );

    // -----------------------------
    // STOCK MARGIN
    // -----------------------------

    const potentialStockMargin =
      totalRetailValue - totalStockValue;

    // -----------------------------
    // RESPONSE
    // -----------------------------

    return NextResponse.json({
      summary: {
        totalSales,
        totalPurchases,
        totalExpenses,

        costOfGoodsSold,
        grossProfit,
        netProfit,

        totalStockValue,
        totalRetailValue,
        potentialStockMargin,

        totalItemsSold,
        totalItemsPurchased,
        totalProducts: products.length,
      },

      sales,
      purchases,
      expenses,
      products,
    });
  } catch (error) {
    console.error("Reports GET Error:", error);

    return NextResponse.json(
      {
        message: "Failed to load reports",
      },
      { status: 500 }
    );
  }
}