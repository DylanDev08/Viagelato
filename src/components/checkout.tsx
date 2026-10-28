"use client";

import Image from "next/image";
import Link from "next/link";
import {useMemo,useRef,useState} from "react";
import {FloatingActions} from "./floating-actions";
import {Footer,Header} from "./storefront";
import {useCart} from "./cart";
import {clearCheckoutKey,checkoutRequestFingerprint,getOrCreateCheckoutKey} from "@/lib/checkout-idempotency";
import {ars,DELIVERY_AREAS,type Product,type Settings,type ShippingZone} from "@/lib/types";
import {cartInquiryMessage} from "@/lib/cart-inquiry";
import {whatsappHref} from "@/lib/whatsapp";

type Created={order_id:string;total:number;payment_method:"transfer"|"on_delivery";bank:null|{bank_alias:string;bank_cbu:string;bank_holder:string}};
type PaymentMethod="transfer"|"on_delivery";

export function Checkout({products,zones,settings,demo,checkoutEnabled}:{products:Product[];zones:ShippingZone[];settings:Settings;demo:boolean;checkoutEnabled:boolean}){
 const {items,setQuantity,clear}=useCart();
 const productMap=useMemo(()=>new Map(products.map(product=>[product.id,product])),[products]);
 const lines=useMemo(()=>items.flatMap(item=>{const product=productMap.get(item.id);return product?[{product,quantity:item.quantity}]:[]}),[items,productMap]);
 const [name,setName]=useState("");const [email,setEmail]=useState("");const [phone,setPhone]=useState("");
 const [inquiryArea,setInquiryArea]=useState("");
 const [address,setAddress]=useState("");const [postalCode,setPostalCode]=useState("");const [zone,setZone]=useState("");
 const [method,setMethod]=useState<"shipping"|"pickup">(zones.length?"shipping":settings.pickup_enabled?"pickup":"shipping");
 const firstPayment:PaymentMethod=settings.transfer_enabled?"transfer":"on_delivery";
 const [paymentMethod,setPaymentMethod]=useState<PaymentMethod>(firstPayment);
 const [busy,setBusy]=useState(false);const busyRef=useRef(false);const [error,setError]=useState("");const [created,setCreated]=useState<Created|null>(null);
 const subtotal=lines.reduce((sum,line)=>sum+Number(line.product.price)*line.quantity,0);
 const selected=zones.find(item=>item.id===zone);
 const freeShipping=Boolean(selected?.free_shipping_eligible)&&subtotal>=Number(settings.free_shipping_threshold);
 const shipping=method==="shipping"&&selected?(freeShipping?0:Number(selected.cost)):0;
 const total=subtotal+shipping;
 const paymentAvailable=settings.transfer_enabled||settings.on_delivery_enabled;
 const canSubmit=checkoutEnabled&&!demo&&lines.length>0&&paymentAvailable&&(method==="pickup"?settings.pickup_enabled:Boolean(selected&&selected.cost!==null));
 const inquiryText=useMemo(()=>cartInquiryMessage(lines.map(({product,quantity})=>({name:product.name,sku:product.sku,presentation:product.presentation,price:Number(product.price),quantity})),inquiryArea,subtotal),[lines,inquiryArea,subtotal]);
 const inquiryHref=whatsappHref(settings.whatsapp,inquiryText);

 async function buy(event:React.FormEvent){
  event.preventDefault();if(busyRef.current)return;busyRef.current=true;setBusy(true);setError("");
  try{
   const payload={
    customer_name:name,customer_email:email,customer_phone:phone,
    address,postal_code:postalCode,shipping_method:method,
    shipping_zone_id:method==="shipping"?zone:null,payment_method:paymentMethod,
    items:lines.map(line=>({product_id:line.product.id,quantity:line.quantity})),
   };
   // La huella no conserva datos del comprador en sessionStorage.
   // Reintentos de la misma solicitud reutilizan clave; cualquier cambio genera otra.
   const body=JSON.stringify(payload);
   const fingerprint=await checkoutRequestFingerprint(body);
   const idempotency=getOrCreateCheckoutKey(fingerprint,sessionStorage,()=>crypto.randomUUID());
   const response=await fetch("/api/checkout",{
    method:"POST",
    headers:{"Content-Type":"application/json","Idempotency-Key":idempotency},
    body,
   });
   const data=await response.json().catch(()=>({error:"El servidor devolvió una respuesta inválida"}));if(!response.ok)throw new Error(data.error||"No se pudo registrar el pedido");if(!data.order_id)throw new Error("El servidor no devolvió el número de pedido");
   clearCheckoutKey(sessionStorage);setCreated({order_id:data.order_id,total:Number(data.total),payment_method:paymentMethod,bank:data.bank??null});clear();
  }catch(reason){setError(reason instanceof Error?reason.message:"Ocurrió un error");}finally{busyRef.current=false;setBusy(false);}
 }

 if(created)return <><Header settings={settings}/><main className="container result"><h1>¡Pedido registrado!</h1><p>Pedido <strong>#{created.order_id.slice(0,8)}</strong> por <strong>{ars(created.total)}</strong>.</p><p>El pedido está pendiente de confirmación. La reserva de stock vence si no se confirma dentro del plazo informado.</p>{created.payment_method==="transfer"&&created.bank?<div className="panel" style={{maxWidth:550}}><h2>Datos para transferir</h2><p><strong>Alias:</strong> {created.bank.bank_alias}</p><p><strong>CBU/CVU:</strong> {created.bank.bank_cbu}</p><p><strong>Titular:</strong> {created.bank.bank_holder}</p><p>El pago sólo se marca como acreditado después de la verificación manual del administrador.</p></div>:created.payment_method==="on_delivery"?<p>El pago se realiza al recibir según la modalidad previamente confirmada por el comercio.</p>:null}<Link className="btn primary" href="/">Volver a la tienda</Link></main><Footer settings={settings}/><FloatingActions whatsapp={settings.whatsapp}/></>;

 return <><Header settings={settings}/><main className="container checkout-page"><Link href="/catalogo">← Volver al catálogo</Link><h1>Tu carrito</h1><div className="checkout-grid"><div><div className="panel"><h2>Productos</h2>{lines.length===0?<div><p>Tu carrito no contiene productos.</p><Link className="text-link" href="/catalogo">Explorar catálogo →</Link></div>:lines.map(({product,quantity})=><div className="cart-item" key={product.id}><div className="mini-art">{product.image_url?<Image src={product.image_url} alt={product.name} fill sizes="56px" unoptimized/>:"📦"}</div><div className="cart-meta"><strong>{product.name}</strong><small>{ars(Number(product.price))}</small><button className="remove-cart" type="button" onClick={()=>setQuantity(product.id,0)}>Eliminar</button></div><div className="qty"><button type="button" onClick={()=>setQuantity(product.id,quantity-1)} aria-label={`Quitar una unidad de ${product.name}`}>−</button><span aria-label={`${quantity} unidades`}>{quantity}</span><button type="button" disabled={quantity>=product.stock} onClick={()=>setQuantity(product.id,quantity+1)} aria-label={`Agregar una unidad de ${product.name}`}>+</button></div></div>)}</div>
  <section className="panel" aria-label="Consulta de disponibilidad"><h2>Consultá antes de comprar</h2><p className="hint">Esta consulta no registra un pedido ni reserva stock. El precio del carrito no incluye envío; te confirmamos la disponibilidad y el reparto antes de coordinar.</p><label>Localidad para consultar<select value={inquiryArea} onChange={event=>setInquiryArea(event.target.value)}><option value="">A confirmar</option>{DELIVERY_AREAS.map(area=><option key={area} value={area}>{area}</option>)}<option value="Otra localidad">Otra localidad</option></select></label>{inquiryHref?<a className="btn primary full" href={inquiryHref} target="_blank" rel="noopener noreferrer">Consultar este carrito por WhatsApp</a>:<Link className="btn full" href="/contacto">Ver medios de contacto</Link>}</section>
 </div>
  {checkoutEnabled&&!demo&&paymentAvailable&&(zones.length>0||settings.pickup_enabled)?<form className="panel" onSubmit={buy}><h2>Confirmar pedido</h2><label>Nombre y apellido<input required maxLength={120} value={name} onChange={event=>setName(event.target.value)}/></label><label>Email<input required type="email" maxLength={200} value={email} onChange={event=>setEmail(event.target.value)}/></label><label>Teléfono<input required maxLength={35} value={phone} onChange={event=>setPhone(event.target.value)}/></label>
   <label>Entrega<select value={method} onChange={event=>setMethod(event.target.value as "shipping"|"pickup")}><option value="shipping">Envío a domicilio</option>{settings.pickup_enabled?<option value="pickup">Retiro en la distribuidora</option>:null}</select></label>
   {method==="shipping"?<>{zones.length===0?<p className="hint" role="status">Las tarifas de envío todavía están pendientes de confirmar. Podés consultar tu localidad por WhatsApp sin generar un pedido.</p>:null}<label>Zona de entrega<select required disabled={!zones.length} value={zone} onChange={event=>setZone(event.target.value)}><option value="">Elegí una zona</option>{zones.map(item=><option key={item.id} value={item.id}>{item.name} · {item.free_shipping_eligible&&subtotal>=Number(settings.free_shipping_threshold)?"Sin cargo":ars(Number(item.cost))}</option>)}</select></label><label>Código postal<input required maxLength={20} value={postalCode} onChange={event=>setPostalCode(event.target.value.toUpperCase())}/></label><label>Dirección de entrega<textarea required maxLength={250} value={address} onChange={event=>setAddress(event.target.value)}/></label><p className="hint">El envío gratuito desde {ars(Number(settings.free_shipping_threshold))} sólo aplica a zonas marcadas como elegibles. Capital Federal y otras zonas requieren consulta.</p></>:null}
   <label>Forma de pago<select value={paymentMethod} onChange={event=>setPaymentMethod(event.target.value as PaymentMethod)} disabled={!paymentAvailable}>{settings.transfer_enabled?<option value="transfer">Transferencia bancaria</option>:null}{settings.on_delivery_enabled?<option value="on_delivery">Pago al recibir</option>:null}{!paymentAvailable?<option>Sin medios configurados</option>:null}</select></label>
   <div className="totals"><p><span>Subtotal</span><strong>{ars(subtotal)}</strong></p><p><span>Envío</span><strong>{method==="shipping"&&!selected?"Elegí zona":ars(shipping)}</strong></p><hr/><p><span>Total estimado</span><strong>{ars(total)}</strong></p></div>{error?<p role="alert" className="error">{error}</p>:null}<button className="btn primary full" disabled={busy||!canSubmit}>{busy?"Registrando pedido…":"Confirmar pedido"}</button>{!canSubmit?<p className="hint">La confirmación online de pedidos aún no está disponible para esta selección. Podés consultar productos, stock y envío por WhatsApp sin generar una compra.</p>:null}<p className="hint">No se procesa ningún cobro online. Disponibilidad, entrega y pago requieren confirmación.</p>
  </form>:<section className="panel" aria-label="Estado de pedidos online"><h2>Pedidos online en preparación</h2><p>Por ahora no se pueden confirmar compras desde la página. Podés consultar los productos, el stock y el reparto mediante WhatsApp, sin enviar datos personales por un formulario que todavía no está habilitado.</p><p className="hint">Las tarifas, los medios de pago y el inventario se habilitarán cuando estén confirmados por Viagelato.</p></section>}</div></main><Footer settings={settings}/><FloatingActions whatsapp={settings.whatsapp}/>;
}
