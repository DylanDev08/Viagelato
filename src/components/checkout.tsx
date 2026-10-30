"use client";

import Image from "next/image";
import {ArrowLeft,ArrowRight,MessageCircle,Minus,Plus,ShoppingBag,Trash2,Truck} from "lucide-react";
import Link from "next/link";
import {useMemo,useState} from "react";
import {useCart} from "./cart";
import {SiteShell} from "./site-shell";
import {ars,DELIVERY_AREAS,type Product,type Settings,type ShippingZone} from "@/lib/types";
import {catalogCartId} from "@/lib/whatsapp-cart";
import {CATALOG_PRICE_ITEMS,type CatalogPriceItem} from "@/lib/catalog-prices";
import {checkoutRequestFingerprint,getOrCreateCheckoutKey,clearCheckoutKey} from "@/lib/checkout-idempotency";

type DisplayItem={
 id:string;name:string;sku?:string|null;presentation?:string|null;
 price:number;image_url:string|null;stock:number|null;
};

export function Checkout({products,settings,catalogItems=CATALOG_PRICE_ITEMS}:{products:Product[];zones:ShippingZone[];settings:Settings;demo:boolean;checkoutEnabled:boolean;catalogItems?:CatalogPriceItem[]}){
 const {items,setQuantity,clear}=useCart();
 const [fullName,setFullName]=useState("");
 const [selectedLocality,setSelectedLocality]=useState("");
 const [otherLocality,setOtherLocality]=useState("");
 const [address,setAddress]=useState("");
 const [notes,setNotes]=useState("");
 const [delivery,setDelivery]=useState<"shipping"|"pickup">("shipping");
 const locality=delivery==="pickup"?"Retiro en local":selectedLocality==="other"?(otherLocality.trim()||"Zona no indicada"):selectedLocality||"Zona no indicada";
 const [paymentMethod,setPaymentMethod]=useState<"transfer"|"cash">("transfer");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [prepared,setPrepared]=useState<{reference:string;url:string}|null>(null);
 const productMap=useMemo(()=>new Map<string,DisplayItem>([
  ...products.map(product=>[product.id,{id:product.id,name:product.name,sku:product.sku,presentation:product.presentation,price:Number(product.price),image_url:product.image_url,stock:product.stock}] as const),
  ...catalogItems.map(product=>[catalogCartId(product.sourceRow),{id:catalogCartId(product.sourceRow),name:product.name,sku:product.sku,presentation:product.presentation,price:product.price,image_url:product.image,stock:null}] as const),
 ]),[products,catalogItems]);
 const lines=useMemo(()=>items.flatMap(item=>{
  const product=productMap.get(item.id);
  return product?[{product,quantity:item.quantity}]:[];
 }),[items,productMap]);
 const count=lines.reduce((sum,line)=>sum+line.quantity,0);
 const subtotal=lines.reduce((sum,line)=>sum+Number(line.product.price)*line.quantity,0);
 const missing=items.length-lines.length;
 const eligible=DELIVERY_AREAS.some(area=>area===locality);
 const canRequest=missing===0&&lines.length>0&&lines.length<=30&&fullName.trim().length>=2&&(delivery==="pickup"||address.trim().length>=3);
 const promo=delivery==="shipping"&&eligible&&subtotal>=Number(settings.free_shipping_threshold);

 async function sendRequest(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  setError("");
  setPrepared(null);
  if(!canRequest)return setError("Completá tu nombre y, si pedís envío, la dirección de entrega. Máximo 30 productos diferentes.");
  setBusy(true);
  try{
   const payload={
    customer_name:fullName,locality,address:delivery==="shipping"?address:"",notes,expected_subtotal:subtotal,
    shipping_method:delivery,payment_method:paymentMethod,
    items:lines.map(({product,quantity})=>({id:product.id,quantity})),
   };
   const body=JSON.stringify(payload);
   const hash=await checkoutRequestFingerprint(body);
   const key=getOrCreateCheckoutKey(hash,sessionStorage,()=>crypto.randomUUID());
   const res=await fetch("/api/whatsapp-request",{
    method:"POST",
    headers:{"Content-Type":"application/json","Idempotency-Key":key},
    body
   });
   const data=await res.json().catch(()=>({error:"El servidor devolvió una respuesta inválida"}));
   if(!res.ok){
    if(data.code==="REQUEST_ALREADY_HANDLED")clearCheckoutKey(sessionStorage);
    throw new Error(data.error||"No se pudo guardar la solicitud");
   }
   if(typeof data.reference!=="string"||typeof data.whatsapp_url!=="string"||!data.whatsapp_url.startsWith("https://wa.me/")||!data.whatsapp_url.includes("?text="))throw new Error("El enlace de WhatsApp no está disponible");
   if(typeof data.subtotal!=="number"||Math.abs(data.subtotal-subtotal)>0.009){
    setError("Los precios cambiaron al preparar el pedido. Actualizá el carrito para revisar el subtotal antes de enviarlo.");
    return;
   }
   setPrepared({reference:data.reference,url:data.whatsapp_url});
   // Se guarda solo la preparación del mensaje. No se afirma que se envió ni se cobró.
   window.location.assign(data.whatsapp_url);
  }catch(reason){
   setError(reason instanceof Error?reason.message:"No se pudo registrar la solicitud.");
  }finally{setBusy(false);}
 }

 return <SiteShell settings={settings} hideFloatingActions><main className="shell checkout-page checkout-refresh">
  <div className="cart-page-heading"><Link className="cart-back-link" href="/catalogo"><ArrowLeft size={17}/> Seguir comprando</Link><p className="kicker">TU SELECCIÓN</p><h1>Mi carrito<span className="cart-count-heading">{count}</span></h1><p>Revisá las cantidades, elegí cómo recibir tu compra y el medio de pago. Enviá todo junto por WhatsApp.</p></div>
  <div className="checkout-grid refined-cart-grid">
   <div>
    <section className="panel cart-products-panel" aria-label="Productos seleccionados">
     <div className="cart-panel-heading"><div><p className="kicker">PASO 01</p><h2>Productos seleccionados</h2></div><span>{count} {count===1?"unidad":"unidades"}</span></div>
     {missing>0?<div className="cart-missing-alert" role="alert"><strong>Hay {missing} {missing===1?"producto que ya no está":"productos que ya no están"} disponible{missing===1?"":"s"}.</strong><p>Revisá tu selección antes de preparar el pedido. No quitamos artículos sin avisarte.</p><button type="button" onClick={()=>items.filter(item=>!productMap.has(item.id)).forEach(item=>setQuantity(item.id,0))}>Quitar artículos no disponibles</button></div>:null}
     {!lines.length?<div className="cart-empty"><ShoppingBag size={32} aria-hidden="true"/><h3>Tu carrito está esperando productos.</h3><p>Elegí helados y congelados del catálogo para preparar tu pedido.</p><Link className="primary-action" href="/catalogo">Explorar catálogo <ArrowRight size={18}/></Link></div>:lines.map(({product,quantity})=><article className="cart-item cart-line" key={product.id}>
      <div className="mini-art cart-line-art">{product.image_url?<Image src={product.image_url} alt={product.name} fill sizes="(max-width:640px) 74px, 96px" unoptimized/>:<ShoppingBag size={24} aria-hidden="true"/>}</div>
      <div className="cart-meta">
       <strong>{product.name}</strong>
       <small>{product.presentation??"Por presentación"}</small><strong className="cart-unit-price">{ars(Number(product.price))} <span>/ presentación</span></strong>
       {product.sku?<small>SKU: {product.sku}</small>:null}
       <small className="cart-stock-notice">Disponibilidad a confirmar</small>
      </div>
      <div className="qty">
       <button type="button" disabled={quantity<=1} onClick={()=>setQuantity(product.id,quantity-1)} aria-label={`Quitar una presentación de ${product.name}`}><Minus size={16}/></button>
       <span aria-label={`${quantity} presentaciones`}>{quantity}</span>
       <button type="button" disabled={quantity>=99} onClick={()=>setQuantity(product.id,quantity+1)} aria-label={`Agregar una presentación de ${product.name}`}><Plus size={16}/></button>
      </div>
      <div className="cart-line-actions"><strong>{ars(Number(product.price)*quantity)}</strong><button className="remove-cart" type="button" onClick={()=>setQuantity(product.id,0)} aria-label={`Eliminar ${product.name} del carrito`}><Trash2 size={15}/> Quitar</button></div>
     </article>)}
     {lines.length?<div className="cart-checkout-tools"><Link href="/catalogo" className="text-link">Seguir agregando productos</Link><button type="button" className="remove-cart" onClick={clear}><Trash2 size={15}/> Vaciar carrito</button></div>:null}
    </section>
    <section className="panel cart-summary-panel" aria-label="Resumen de pedido">
     <h2>Resumen de tu selección</h2>
     <div className="totals">
      <p><span>Presentaciones</span><strong>{count}</strong></p>
      <p><span>Subtotal de productos</span><strong>{ars(subtotal)}</strong></p>
      <p><span>{delivery==="pickup"?"Retiro":"Envío"}</span><strong>{delivery==="pickup"?"En el local":promo?"Promoción a confirmar":"A coordinar"}</strong></p>
      <hr/>
      <p><span>Total final</span><strong>Se confirma por WhatsApp</strong></p>
     </div>
     <p className="hint">Precios por caja, balde o presentación completa. El equipo confirmará stock y entrega.</p>
    </section>
   </div>
   <form className="panel cart-form-panel" onSubmit={sendRequest}>
    <div className="cart-form-heading"><p className="kicker">PASO 02</p><MessageCircle size={22} aria-hidden="true"/><h2>Enviar pedido por WhatsApp</h2></div>
    <p className="hint">Completá tus datos para preparar el pedido con todos los productos del carrito. Viagelato confirmará por WhatsApp la disponibilidad, entrega y forma de pago elegida.</p>
    <label>Nombre y apellido<input required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)}/></label>
    <label>Entrega<select value={delivery} onChange={e=>setDelivery(e.target.value as "shipping"|"pickup")}><option value="shipping">Envío a domicilio</option><option value="pickup">Retiro en el local</option></select></label>
    {delivery==="shipping"?<label>Zona de entrega (opcional)<select value={selectedLocality} onChange={e=>setSelectedLocality(e.target.value)}>
     <option value="">Seleccionar zona (opcional)</option>
     {DELIVERY_AREAS.map(area=><option key={area} value={area}>{area}</option>)}
     <option value="other">Otra localidad (consultar cobertura)</option>
    </select></label>:null}
    {delivery==="shipping"&&selectedLocality==="other"?<label>Escribí tu localidad<input minLength={2} maxLength={100} autoComplete="address-level2" aria-label="Escribí tu localidad" value={otherLocality} onChange={e=>setOtherLocality(e.target.value)} placeholder="Por ejemplo: Quilmes" aria-describedby="other-locality-help"/><small id="other-locality-help">Vamos a confirmar la cobertura y el costo de entrega.</small></label>:null}
    {delivery==="pickup"?<div className="whatsapp-payment-info"><strong>Retiro en el local</strong><p>{settings.address || "Dirección a confirmar por WhatsApp"}</p><p>Coordinaremos el horario de retiro por WhatsApp.</p></div>:null}
    {delivery==="shipping"?<label>Dirección de entrega<input required maxLength={250} autoComplete="street-address" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Calle, altura y piso"/></label>:null}
    <label>Método de pago<select value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value as "transfer"|"cash")}><option value="transfer">Transferencia bancaria</option><option value="cash">Efectivo (al recibir o retirar)</option></select></label>
    <label>Observaciones (opcional)<textarea maxLength={350} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Horarios, preferencias de sabores, etc."/></label>
    <div className="whatsapp-payment-info">
     <strong>{paymentMethod==="cash"?"Pago en efectivo":"Pago por transferencia bancaria"}</strong>
     <p>{delivery==="pickup"?"Coordinaremos la disponibilidad y horario de retiro.":promo?`Tu compra alcanza la promoción de envío en zona elegible (desde ${ars(settings.free_shipping_threshold)}), sujeta a confirmación.`:"Te confirmamos la disponibilidad y, si corresponde, el costo de envío."}</p>
    </div>
    {error?<p className="error" role="alert">{error}</p>:null}
    {lines.length>30?<p role="alert" className="error">Máximo 30 productos diferentes por solicitud. Quitá algunos para continuar.</p>:null}
    <button type="submit" className="btn primary full cart-submit" disabled={!canRequest||busy}>{busy?"Preparando solicitud…":<>Enviar pedido por WhatsApp <ArrowRight size={18}/></>}</button>
    {prepared?<p role="status">Pedido {prepared.reference} preparado. <a href={prepared.url} rel="noopener noreferrer">Abrir WhatsApp para enviar el mensaje</a>. Si no lo enviás, seguirá pendiente de contacto.</p>:null}
    <p className="cart-form-footnote"><Truck size={16} aria-hidden="true"/> {delivery==="pickup"?"Coordinaremos el horario de retiro y el pago.":"Confirmaremos disponibilidad, envío y pago antes de cerrar el pedido."}</p><p className="hint">WhatsApp se abrirá con el mensaje listo para revisar y enviar. El carrito permanece guardado hasta que vos decidas vaciarlo.</p>
   </form>
  </div>
 </main></SiteShell>;
}
