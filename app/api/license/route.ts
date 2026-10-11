import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomBytes, randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";

const INSTALLATION_COOKIE = "hak_mrs_installation_id";

const ALLOWED_TYPES = [
  "TRIAL",
  "MONTHLY",
  "YEARLY",
  "LIFETIME",
] as const;

type LicenseType = (typeof ALLOWED_TYPES)[number];

function generateLicenseKey() {
  const part = () =>
    randomBytes(4)
      .toString("hex")
      .toUpperCase();

  return `HAK-${part()}-${part()}-${part()}`;
}

function calculateExpiry(
  type: LicenseType,
  startDate: Date
) {
  const expiry = new Date(startDate);

  switch (type) {
    case "TRIAL":
      expiry.setDate(expiry.getDate() + 7);
      return expiry;

    case "MONTHLY":
      expiry.setDate(expiry.getDate() + 30);
      return expiry;

    case "YEARLY":
      expiry.setDate(expiry.getDate() + 365);
      return expiry;

    case "LIFETIME":
      return null;

    default:
      return null;
  }
}

function getClientIp(request: Request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for");

  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }

  return (
    request.headers.get("x-real-ip") ||
    "UNKNOWN"
  );
}

async function getInstallationId() {
  const cookieStore = await cookies();

  let installationId = cookieStore.get(
    INSTALLATION_COOKIE
  )?.value;

  if (!installationId) {
    installationId = randomUUID();
  }

  return {
    installationId,
    cookieStore,
  };
}

function addInstallationCookie(
  response: NextResponse,
  installationId: string
) {
  response.cookies.set(
    INSTALLATION_COOKIE,
    installationId,
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365 * 5,
      path: "/",
    }
  );

  return response;
}

/**
 * GET
 * Check current license
 */
export async function GET(request: Request) {
  try {
    const business =
      await prisma.business.findFirst({
        include: {
          license: true,
        },
      });

    if (!business) {
      const response = NextResponse.json(
        {
          active: false,
          license: null,
          message: "Business not found.",
        },
        { status: 404 }
      );

      const { installationId } =
        await getInstallationId();

      return addInstallationCookie(
        response,
        installationId
      );
    }

    const { installationId } =
      await getInstallationId();

    const license = business.license;

    if (!license) {
      const response = NextResponse.json({
        active: false,
        license: null,
        message: "No license found.",
        trialAvailable: true,
      });

      return addInstallationCookie(
        response,
        installationId
      );
    }

    let active =
      license.status === "ACTIVE";

    // Check expiry
    if (
      license.expiresAt &&
      new Date() > license.expiresAt
    ) {
      active = false;

      if (license.status !== "EXPIRED") {
        await prisma.license.update({
          where: {
            id: license.id,
          },
          data: {
            status: "EXPIRED",
            lastVerifiedAt: new Date(),
          },
        });

        license.status = "EXPIRED";
      }
    }

    // Update verification time
    await prisma.license.update({
      where: {
        id: license.id,
      },
      data: {
        lastVerifiedAt: new Date(),
      },
    });

    const response = NextResponse.json({
      active,
      license,
      trialAvailable: false,
      installationId,
    });

    return addInstallationCookie(
      response,
      installationId
    );
  } catch (error) {
    console.error(
      "License GET Error:",
      error
    );

    return NextResponse.json(
      {
        active: false,
        license: null,
        message:
          error instanceof Error
            ? error.message
            : "Failed to check license.",
      },
      { status: 500 }
    );
  }
}

/**
 * POST
 *
 * Supported actions:
 *
 * TRIAL
 * PAYMENT_REQUIRED
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const type = String(
      body.type || "TRIAL"
    ).toUpperCase() as LicenseType;

    if (!ALLOWED_TYPES.includes(type)) {
      return NextResponse.json(
        {
          success: false,
          message: "Invalid license type.",
        },
        { status: 400 }
      );
    }

    const business =
      await prisma.business.findFirst();

    if (!business) {
      return NextResponse.json(
        {
          success: false,
          message: "Business not found.",
        },
        { status: 404 }
      );
    }

    const {
      installationId,
    } = await getInstallationId();

    const clientIp =
      getClientIp(request);

    const existingLicense =
      await prisma.license.findUnique({
        where: {
          businessId: business.id,
        },
        include: {
          activations: true,
        },
      });

    /**
     * ==========================================
     * FREE TRIAL
     * ==========================================
     */

    if (type === "TRIAL") {
      // Trial can only be started once.
      if (existingLicense) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Your free trial has already been used or a license already exists.",
          },
          { status: 409 }
        );
      }

      const activatedAt =
        new Date();

      const expiresAt =
        calculateExpiry(
          "TRIAL",
          activatedAt
        );

      const licenseKey =
        generateLicenseKey();

      const license =
        await prisma.license.create({
          data: {
            licenseKey,
            type: "TRIAL",
            status: "ACTIVE",
            activatedAt,
            expiresAt,
            trialUsed: true,
            installationId,
            lastIp: clientIp,
            lastVerifiedAt:
              new Date(),
            businessId:
              business.id,

            activations: {
              create: {
                installationId,
                ipAddress:
                  clientIp,
              },
            },
          },
        });

      const response =
        NextResponse.json({
          success: true,
          message:
            "7-day free trial activated successfully.",
          license,
        });

      return addInstallationCookie(
        response,
        installationId
      );
    }

    /**
     * ==========================================
     * PAID LICENSE
     * ==========================================
     *
     * Monthly / Yearly / Lifetime
     * can NOT be activated directly.
     *
     * Payment gateway will be connected
     * in the next phase.
     */

    const prices: Record<
      Exclude<LicenseType, "TRIAL">,
      number
    > = {
      MONTHLY: 2500,
      YEARLY: 20000,
      LIFETIME: 50000,
    };

    return NextResponse.json(
      {
        success: false,
        paymentRequired: true,
        type,
        amount: prices[type],
        currency: "PKR",
        message:
          "Payment is required before activating this license.",
      },
      { status: 402 }
    );
  } catch (error) {
    console.error(
      "License POST Error:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Failed to process license request.",
      },
      { status: 500 }
    );
  }
}