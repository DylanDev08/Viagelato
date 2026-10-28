import { NextResponse } from "next/server";
import { connected } from "@/lib/supabase";

/** Liveness (200) es distinto de readiness comercial: mañana se configura Supabase. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({
    service: "viagelato-api",
    status: "ok",
    databaseConfigured: connected(),
    checkoutEnabled: connected() && process.env.ENABLE_CHECKOUT === "true",
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
