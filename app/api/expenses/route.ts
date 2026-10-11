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

    const expenses = await prisma.expense.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(expenses);
  } catch (error) {
    console.error("Expenses GET Error:", error);

    return NextResponse.json(
      {
        message: "Failed to load expenses",
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

    const title = String(body.title || "").trim();
    const category = String(body.category || "").trim();
    const description = String(body.description || "").trim();
    const amount = Number(body.amount);

    if (!title) {
      return NextResponse.json(
        {
          message: "Expense title is required",
        },
        { status: 400 }
      );
    }

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        {
          message: "Valid expense amount is required",
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

    const expense = await prisma.expense.create({
      data: {
        title,
        amount,
        category: category || null,
        description: description || null,
        business: {
          connect: {
            id: business.id,
          },
        },
      },
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    console.error("Expense POST Error:", error);

    return NextResponse.json(
      {
        message:
          error instanceof Error
            ? error.message
            : "Failed to create expense",
      },
      { status: 500 }
    );
  }
}