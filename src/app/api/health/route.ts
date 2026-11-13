import {NextResponse} from "next/server";

/** Public liveness only. Never reveal DB readiness, provider, feature flags or keys. */
export const runtime="nodejs";
export const dynamic="force-dynamic";
export function GET(){
 return NextResponse.json({status:"ok"},{
  headers:{"Cache-Control":"no-store","X-Robots-Tag":"noindex, nofollow"}
 });
}
