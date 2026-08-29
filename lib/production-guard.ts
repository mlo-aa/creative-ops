import { NextResponse } from "next/server";

/** True on Vercel production and local `next build && next start`. */
export function isProductionDeploy(): boolean {
  return process.env.NODE_ENV === "production";
}

export function productionNotFoundResponse(): NextResponse {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** Block dev/diagnostic handlers in production — returns a 404 response or null. */
export function blockDevInProduction(): NextResponse | null {
  if (isProductionDeploy()) return productionNotFoundResponse();
  return null;
}
