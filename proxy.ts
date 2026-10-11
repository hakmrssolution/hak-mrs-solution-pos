import { NextRequest, NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Login page is always public
  if (pathname === "/login") {
    return NextResponse.next();
  }

  // License page must remain accessible even if license is expired
  if (pathname === "/settings/license") {
    return NextResponse.next();
  }

  // Check login session
  const token = request.cookies.get("pos_session")?.value;

  if (!token) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const session = await verifySessionToken(token);

  if (!session) {
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  // Check license for protected operational pages
  const protectedPaths = [
    "/",
    "/pos",
    "/products",
    "/sales",
    "/purchases",
    "/customers",
    "/suppliers",
    "/expenses",
    "/reports",
  ];

  const isProtectedPath = protectedPaths.some(
    (path) =>
      pathname === path ||
      pathname.startsWith(`${path}/`)
  );

  if (isProtectedPath) {
    try {
      const licenseUrl = new URL(
        "/api/license",
        request.url
      );

      const licenseResponse = await fetch(licenseUrl, {
        headers: {
          cookie: request.headers.get("cookie") || "",
        },
        cache: "no-store",
      });

      if (!licenseResponse.ok) {
        const licenseUrl = new URL(
          "/settings/license",
          request.url
        );

        return NextResponse.redirect(licenseUrl);
      }

      const licenseData = await licenseResponse.json();

      if (!licenseData.active) {
        const licenseUrl = new URL(
          "/settings/license",
          request.url
        );

        return NextResponse.redirect(licenseUrl);
      }
    } catch (error) {
      console.error("License Check Error:", error);

      const licenseUrl = new URL(
        "/settings/license",
        request.url
      );

      return NextResponse.redirect(licenseUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/pos/:path*",
    "/products/:path*",
    "/sales/:path*",
    "/purchases/:path*",
    "/customers/:path*",
    "/suppliers/:path*",
    "/expenses/:path*",
    "/reports/:path*",
    "/settings/:path*",
  ],
};