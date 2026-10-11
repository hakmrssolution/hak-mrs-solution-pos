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
        {
          status: 403,
        }
      );
    }

    const { searchParams } = new URL(request.url);
    const range = searchParams.get("range") || "week";

    const business = await prisma.business.findFirst();

    if (!business) {
      return NextResponse.json({
        todaySales: 0,
        yesterdaySales: 0,
        totalProducts: 0,
        customers: 0,
        lowStock: 0,
        salesData: [],
      });
    }

    const now = new Date();

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const tomorrowStart = new Date(todayStart);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);

    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const weekStart = new Date(todayStart);
    const day = weekStart.getDay();
    const difference = day === 0 ? 6 : day - 1;
    weekStart.setDate(weekStart.getDate() - difference);

    const monthStart = new Date(
      todayStart.getFullYear(),
      todayStart.getMonth(),
      1
    );

    const yearStart = new Date(
      todayStart.getFullYear(),
      0,
      1
    );

    const [todaySales, yesterdaySales, totalProducts, customers, lowStock] =
      await Promise.all([
        prisma.sale.aggregate({
          where: {
            businessId: business.id,
            createdAt: {
              gte: todayStart,
              lt: tomorrowStart,
            },
          },
          _sum: {
            total: true,
          },
        }),

        prisma.sale.aggregate({
          where: {
            businessId: business.id,
            createdAt: {
              gte: yesterdayStart,
              lt: todayStart,
            },
          },
          _sum: {
            total: true,
          },
        }),

        prisma.product.count({
          where: {
            businessId: business.id,
          },
        }),

        prisma.customer.count({
          where: {
            businessId: business.id,
          },
        }),

        prisma.product.count({
          where: {
            businessId: business.id,
            stock: {
              lte: 5,
            },
          },
        }),
      ]);

    let startDate: Date;
    let endDate: Date = tomorrowStart;

    let salesData: {
      label: string;
      date: string;
      total: number;
    }[] = [];

    if (range === "today") {
      startDate = todayStart;

      const sales = await prisma.sale.findMany({
        where: {
          businessId: business.id,
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          total: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const hourlySales = Array.from(
        { length: 24 },
        (_, hour) => {
          const total = sales
            .filter((sale) => {
              return new Date(sale.createdAt).getHours() === hour;
            })
            .reduce((sum, sale) => sum + sale.total, 0);

          return {
            label: `${hour}:00`,
            date: `${todayStart.toISOString()}-${hour}`,
            total,
          };
        }
      );

      salesData = hourlySales;
    }

    if (range === "week") {
      startDate = weekStart;

      const sales = await prisma.sale.findMany({
        where: {
          businessId: business.id,
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          total: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      salesData = Array.from({ length: 7 }, (_, index) => {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + index);

        const total = sales
          .filter((sale) => {
            const saleDate = new Date(sale.createdAt);

            return (
              saleDate.getFullYear() === date.getFullYear() &&
              saleDate.getMonth() === date.getMonth() &&
              saleDate.getDate() === date.getDate()
            );
          })
          .reduce((sum, sale) => sum + sale.total, 0);

        return {
          label: date.toLocaleDateString("en-US", {
            weekday: "short",
          }),
          date: date.toISOString().split("T")[0],
          total,
        };
      });
    }

    if (range === "month") {
      startDate = monthStart;

      const nextMonth = new Date(
        todayStart.getFullYear(),
        todayStart.getMonth() + 1,
        1
      );

      endDate = nextMonth;

      const sales = await prisma.sale.findMany({
        where: {
          businessId: business.id,
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          total: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      const daysInMonth = new Date(
        todayStart.getFullYear(),
        todayStart.getMonth() + 1,
        0
      ).getDate();

      salesData = Array.from(
        { length: daysInMonth },
        (_, index) => {
          const date = new Date(
            todayStart.getFullYear(),
            todayStart.getMonth(),
            index + 1
          );

          const total = sales
            .filter((sale) => {
              const saleDate = new Date(sale.createdAt);

              return (
                saleDate.getFullYear() === date.getFullYear() &&
                saleDate.getMonth() === date.getMonth() &&
                saleDate.getDate() === date.getDate()
              );
            })
            .reduce((sum, sale) => sum + sale.total, 0);

          return {
            label: String(index + 1),
            date: date.toISOString().split("T")[0],
            total,
          };
        }
      );
    }

    if (range === "year") {
      startDate = yearStart;

      const nextYear = new Date(
        todayStart.getFullYear() + 1,
        0,
        1
      );

      endDate = nextYear;

      const sales = await prisma.sale.findMany({
        where: {
          businessId: business.id,
          createdAt: {
            gte: startDate,
            lt: endDate,
          },
        },
        select: {
          total: true,
          createdAt: true,
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      salesData = Array.from({ length: 12 }, (_, index) => {
        const date = new Date(
          todayStart.getFullYear(),
          index,
          1
        );

        const total = sales
          .filter((sale) => {
            const saleDate = new Date(sale.createdAt);

            return (
              saleDate.getFullYear() === date.getFullYear() &&
              saleDate.getMonth() === date.getMonth()
            );
          })
          .reduce((sum, sale) => sum + sale.total, 0);

        return {
          label: date.toLocaleDateString("en-US", {
            month: "short",
          }),
          date: `${date.getFullYear()}-${index + 1}`,
          total,
        };
      });
    }

    const todayTotal = todaySales._sum.total || 0;
    const yesterdayTotal = yesterdaySales._sum.total || 0;

    let percentage = 0;

    if (yesterdayTotal > 0) {
      percentage =
        ((todayTotal - yesterdayTotal) / yesterdayTotal) * 100;
    } else if (todayTotal > 0) {
      percentage = 100;
    }

    return NextResponse.json({
      todaySales: todayTotal,
      yesterdaySales: yesterdayTotal,
      salesChange: Number(percentage.toFixed(1)),
      totalProducts,
      customers,
      lowStock,
      salesData,
    });
  } catch (error) {
    console.error("Dashboard GET Error:", error);

    return NextResponse.json(
      {
        message: "Failed to load dashboard data",
      },
      {
        status: 500,
      }
    );
  }
}