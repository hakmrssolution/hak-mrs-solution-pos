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

    let business = await prisma.business.findFirst();

    if (!business) {
      business = await prisma.business.create({
        data: {
          name: "My Retail Store",
        },
      });
    }

    return NextResponse.json(business);
  } catch (error) {
    console.error("Business GET Error:", error);

    return NextResponse.json(
      {
        message: "Failed to load business information",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PUT(request: Request) {
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

    const name = String(body.name || "").trim();
    const address = String(body.address || "").trim();
    const phone = String(body.phone || "").trim();
    const email = String(body.email || "").trim();
    const logo = String(body.logo || "").trim();

    const currency =
      String(body.currency || "Rs.").trim() || "Rs.";

    const receiptFooter =
      String(body.receiptFooter || "Thank You!").trim() ||
      "Thank You!";

    const showLogo =
      typeof body.showLogo === "boolean"
        ? body.showLogo
        : true;

    const showPhone =
      typeof body.showPhone === "boolean"
        ? body.showPhone
        : true;

    const showEmail =
      typeof body.showEmail === "boolean"
        ? body.showEmail
        : true;

    const showAddress =
      typeof body.showAddress === "boolean"
        ? body.showAddress
        : true;

    if (!name) {
      return NextResponse.json(
        {
          message: "Business name is required",
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
          name,
          address: address || null,
          phone: phone || null,
          email: email || null,
          logo: logo || null,

          currency,
          receiptFooter,
          showLogo,
          showPhone,
          showEmail,
          showAddress,
        },
      });
    } else {
      business = await prisma.business.update({
        where: {
          id: business.id,
        },

        data: {
          name,
          address: address || null,
          phone: phone || null,
          email: email || null,
          logo: logo || null,

          currency,
          receiptFooter,
          showLogo,
          showPhone,
          showEmail,
          showAddress,
        },
      });
    }

    return NextResponse.json(business);
  } catch (error) {
    console.error("Business PUT Error:", error);

    return NextResponse.json(
      {
        message: "Failed to update business information",
      },
      {
        status: 500,
      }
    );
  }
}