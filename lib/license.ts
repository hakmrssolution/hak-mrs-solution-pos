import { prisma } from "@/lib/prisma";

export async function getLicenseStatus() {
  const business = await prisma.business.findFirst({
    include: {
      license: true,
    },
  });

  if (!business || !business.license) {
    return {
      active: false,
      license: null,
    };
  }

  const license = business.license;

  if (
    license.status === "ACTIVE" &&
    license.expiresAt &&
    new Date() > license.expiresAt
  ) {
    await prisma.license.update({
      where: {
        id: license.id,
      },
      data: {
        status: "EXPIRED",
      },
    });

    return {
      active: false,
      license: {
        ...license,
        status: "EXPIRED",
      },
    };
  }

  return {
    active: license.status === "ACTIVE",
    license,
  };
}

/**
 * Used by protected API routes.
 * Returns true only when a valid active license exists.
 */
export async function requireActiveLicense() {
  const { active } = await getLicenseStatus();

  return active;
}