import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== "production") {
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/dev")) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const blockedApiPrefixes = [
    "/api/cloud/import",
    "/api/cloud/live-schema",
    "/api/cloud/migration-status",
    "/api/cloud/reset-migration-marker",
    "/api/cloud/test",
    "/api/cloud/snapshot/migrate",
  ];

  if (blockedApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dev/:path*", "/api/cloud/import", "/api/cloud/live-schema", "/api/cloud/migration-status", "/api/cloud/reset-migration-marker", "/api/cloud/test", "/api/cloud/snapshot/migrate"],
};
