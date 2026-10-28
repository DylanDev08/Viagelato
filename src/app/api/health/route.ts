import { NextResponse } from "next/server";
import { connected } from "@/lib/supabase";

/** Liveness (200) es distinto de readiness comercial. No incluir secretos en esta ruta. */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export function GET() {
  const host = process.env.RENDER_SERVICE_ID ? "render" : process.env.VERCEL ? "vercel" : "local";
  return NextResponse.json({
    service: "viagelato-api",
    status: "ok",
    host,
    databaseConfigured: connected(),
    checkoutEnabled: connected() && process.env.ENABLE_CHECKOUT === "true",
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
