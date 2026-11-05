import {NextResponse} from "next/server";

export const runtime="nodejs";

/**
 * El checkout que reservaba stock quedó retirado del e-commerce.
 * Los pedidos vigentes se preparan exclusivamente por /api/whatsapp-request,
 * y se confirman manualmente después del contacto con el cliente.
 *
 * Esta respuesta NO depende de ENABLE_CHECKOUT ni lee/escribe Supabase.
 */
export async function POST(){
 return NextResponse.json({
  error:"El checkout anterior fue retirado. Prepará tu pedido desde el carrito por WhatsApp.",
  code:"LEGACY_CHECKOUT_DISABLED"
 },{status:410,headers:{"Cache-Control":"no-store"}});
}
