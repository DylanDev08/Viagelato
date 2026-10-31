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
import {checkoutRequestFingerprint,getOrCreateCheckoutKey,clearCheckoutKey,checkoutKeyStorage} from "@/lib/checkout-idempotency";
import {quoteShipping} from "@/lib/shipping-quote";

type DisplayItem={
 id:string;name:string;sku?:string|null;presentation?:string|null;
 price:number;image_url:string|null;stock:number|null;
};

export function Checkout({products,zones,settings,catalogItems=CATALOG_PRICE_ITEMS}:{products:Product[];zones:ShippingZone[];settings:Settings;demo:boolean;checkoutEnabled:boolean;catalogItems?:CatalogPriceItem[]}){
 const {items,setQuantity,clear}=useCart();
 const [fullName,setFullName]=useState("");
 const [selectedLocality,setSelectedLocality]=useState("");
 const [otherLocality,setOtherLocality]=useState("");
 const locality=selectedLocality==="other"?otherLocality.trim():selectedLocality;
 const [address,setAddress]=useState("");
 const [notes,setNotes]=useState("");
 const [delivery,setDelivery]=useState<"shipping"|"pickup">("shipping");
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const [prepared,setPrepared]=useState<{reference:string;url:string;selection:string}|null>(null);
 const selection=JSON.stringify({items,fullName,locality,address,notes,delivery});
 const productMap=useMemo(()=>new Map<string,DisplayItem>([
  ...products.map(product=>[product.id,{id:product.id,name:product.name,sku:product.sku,presentation:product.presentation,price:Number(product.price),image_url:product.image_url,stock:product.stock}] as const),
  ...catalogItems.map(product=>[catalogCartId(product.sourceRow),{id:catalogCartId(product.sourceRow),name:product.name,sku:product.sku,presentation:product.presentation,price:product.price,image_url:product.image,stock:null}] as const),
 ]),[products,catalogItems]);
 const lines=useMemo(()=>items.flatMap(item=>{
  const product=productMap.get(item.id);
  return product?[{product,quantity:item.quantity}]:[];
 }),[items,productMap]);
 const count=lines.reduce((sum,line)=>sum+line.quantity,0);
 const subtotal=lines.reduce((sum,line)=>sum+Math.round(Number(line.product.price)*100)*line.quantity,0)/100;
 const unavailable=lines.some(({product,quantity})=>!Number.isFinite(product.price)||product.price<=0||
  (product.stock!==null&&quantity>product.stock));
 const missing=items.length-lines.length;
 const shipping=quoteShipping({subtotal,locality,method:delivery,freeShippingThreshold:Number(settings.free_shipping_threshold),zones});
 const canRequest=!unavailable&&missing===0&&lines.length>0&&lines.length<=30&&fullName.trim().length>=2&&locality.trim().length>=2;

 async function sendRequest(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(busy)return;
  setError("");
  setPrepared(null);
  if(!canRequest)return setError("Completá nombre y localidad, con un máximo de 30 productos diferentes.");
  setBusy(true);
  try{
   const payload={
    customer_name:fullName,locality,address:delivery==="shipping"?address:"",notes,expected_subtotal:subtotal,
    shipping_method:delivery,
    items:lines.map(({product,quantity})=>({id:product.id,quantity})),
   };
   const body=JSON.stringify(payload);
   const hash=await checkoutRequestFingerprint(body);
   const key=getOrCreateCheckoutKey(hash,checkoutKeyStorage,()=>crypto.randomUUID());
   const res=await fetch("/api/whatsapp-request",{
    method:"POST",
    headers:{"Content-Type":"application/json","Idempotency-Key":key},
    body
   });
   const data=await res.json().catch(()=>({error:"El servidor devolvió una respuesta inválida"}));
   if(!res.ok){
    if(data.code==="REQUEST_ALREADY_HANDLED")clearCheckoutKey(checkoutKeyStorage);
    throw new Error(data.error||"No se pudo guardar la solicitud");
   }
   if(typeof data.reference!=="string"||typeof data.whatsapp_url!=="string"||!data.whatsapp_url.startsWith("https://wa.me/")||!data.whatsapp_url.includes("?text="))throw new Error("El enlace de WhatsApp no está disponible");
   if(typeof data.subtotal!=="number"||Math.abs(data.subtotal-subtotal)>0.009){
    setError("Los precios cambiaron al preparar el pedido. Actualizá el carrito para revisar el subtotal antes de enviarlo.");
    return;
   }
   if(data.shipping_cost!==undefined&&
      (data.shipping_cost===null)!==(shipping.shippingCost===null)||
      (data.shipping_cost!==undefined&&data.shipping_cost!==null&&shipping.shippingCost!==null&&
       Math.abs(Number(data.shipping_cost)-shipping.shippingCost)>0.009)){
    setError("Las condiciones de envío cambiaron. Actualizá el carrito para verificar el importe antes de continuar.");
    return;
   }
   setPrepared({reference:data.reference,url:data.whatsapp_url,selection});
   // Se guarda solo la preparación del mensaje. No se afirma que se envió ni se cobró.
   window.location.assign(data.whatsapp_url);
  }catch(reason){
   setError(reason instanceof Error?reason.message:"No se pudo registrar la solicitud.");
  }finally{setBusy(false);}
 }

 return <SiteShell settings={settings} hideFloatingActions><main className="shell checkout-page checkout-refresh">
  <div className="cart-page-heading"><Link className="cart-back-link" href="/catalogo"><ArrowLeft size={17}/> Seguir comprando</Link><p className="kicker">TU SELECCIÓN</p><h1>Mi carrito<span className="cart-count-heading">{count}</span></h1><p>Elegí tus productos, seleccioná la zona de entrega y revisá el importe antes de continuar. <strong>El pago se coordina de forma segura por WhatsApp.</strong></p></div>
  <div className="checkout-grid refined-cart-grid">
   <div>
    <section className="panel cart-products-panel" aria-label="Productos seleccionados">
     <div className="cart-panel-heading"><div><p className="kicker">PASO 01</p><h2>Productos seleccionados</h2></div><span>{count} {count===1?"unidad":"unidades"}</span></div>
     {missing>0?<div className="cart-missing-alert" role="alert"><strong>Hay {missing} {missing===1?"producto que ya no está":"productos que ya no están"} disponible{missing===1?"":"s"}.</strong><p>Revisá tu selección antes de preparar el pedido. No quitamos artículos sin avisarte.</p><button type="button" disabled={busy} onClick={()=>items.filter(item=>!productMap.has(item.id)).forEach(item=>setQuantity(item.id,0))}>Quitar artículos no disponibles</button></div>:null}
     {!lines.length?<div className="cart-empty"><ShoppingBag size={32} aria-hidden="true"/><h3>Tu carrito está esperando productos.</h3><p>Elegí helados y congelados del catálogo para preparar tu consulta.</p><Link className="primary-action" href="/catalogo">Explorar catálogo <ArrowRight size={18}/></Link></div>:lines.map(({product,quantity})=><article className="cart-item cart-line" key={product.id}>
      <div className="mini-art cart-line-art">{product.image_url?<Image src={product.image_url} alt={product.name} fill sizes="(max-width:640px) 74px, 96px" unoptimized/>:<ShoppingBag size={24} aria-hidden="true"/>}</div>
      <div className="cart-meta">
       <strong>{product.name}</strong>
       <small>{product.presentation??"Por presentación"}</small><strong className="cart-unit-price">{ars(Number(product.price))} <span>/ presentación</span></strong>
       {product.sku?<small>SKU: {product.sku}</small>:null}
       <small className="cart-stock-notice">{product.stock===null?"Disponibilidad a confirmar":product.stock===0?"Sin stock":`Stock informado: ${product.stock}`}</small>
      </div>
      <div className="qty">
       <button type="button" disabled={busy||quantity<=1} onClick={()=>setQuantity(product.id,quantity-1)} aria-label={`Quitar una presentación de ${product.name}`}><Minus size={16}/></button>
       <span aria-label={`${quantity} presentaciones`}>{quantity}</span>
       <button type="button" disabled={busy||quantity>=Math.min(product.stock??99,99)} onClick={()=>setQuantity(product.id,quantity+1)} aria-label={`Agregar una presentación de ${product.name}`}><Plus size={16}/></button>
      </div>
      <div className="cart-line-actions"><strong>{ars(Number(product.price)*quantity)}</strong><button className="remove-cart" type="button" disabled={busy} onClick={()=>setQuantity(product.id,0)} aria-label={`Eliminar ${product.name} del carrito`}><Trash2 size={15}/> Quitar</button></div>
     </article>)}
     {lines.length?<div className="cart-checkout-tools"><Link href="/catalogo" className="text-link">Seguir agregando productos</Link><button type="button" className="remove-cart" disabled={busy} onClick={clear}><Trash2 size={15}/> Vaciar carrito</button></div>:null}
    </section>
    <section className="cart-price-overview" aria-label="Importe de productos">
     <span>Subtotal de productos</span><strong>{ars(subtotal)}</strong>
    </section>

   </div>
   <form className="panel cart-form-panel" onSubmit={sendRequest}>
    <div className="cart-form-heading"><p className="kicker">PASO 02</p><MessageCircle size={22} aria-hidden="true"/><h2>Datos de entrega y pago</h2></div>
    <p className="hint">Elegí dónde recibís tu pedido. El total se actualiza según los productos y el envío. Luego coordinás el pago con Viagelato por WhatsApp.</p>
    <label>Nombre y apellido<input disabled={busy} required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)}/></label>
    <label>Zona de entrega<select disabled={busy} required value={selectedLocality} onChange={e=>setSelectedLocality(e.target.value)}>
     <option value="">Elegí tu localidad</option>
     {DELIVERY_AREAS.map(area=><option key={area} value={area}>{area}</option>)}
     <option value="other">Fuera de las zonas indicadas / Otra localidad</option>
    </select></label>
    {selectedLocality==="other"?<label>Escribí tu localidad<input disabled={busy} required minLength={2} maxLength={100} autoComplete="address-level2" aria-label="Escribí tu localidad" value={otherLocality} onChange={e=>setOtherLocality(e.target.value)} placeholder="Por ejemplo: Quilmes" aria-describedby="other-locality-help"/><small id="other-locality-help">Esta zona requiere cotización de envío y confirmación de cobertura.</small></label>:null}
    {settings.pickup_enabled?<label>Entrega<select disabled={busy} value={delivery} onChange={e=>setDelivery(e.target.value as "shipping"|"pickup")}><option value="shipping">Envío a domicilio</option><option value="pickup">Consultar retiro</option></select></label>:null}
    <section className="cart-price-breakdown" aria-label="Resumen y total del pedido" aria-live="polite">
     <div className="cart-price-breakdown-title"><h3>Tu total</h3><span>{count} {count===1?"presentación":"presentaciones"}</span></div>
     <div className="cart-price-row"><span>Productos</span><strong>{ars(subtotal)}</strong></div>
     <div className="cart-price-row"><span>Envío{locality&&delivery==="shipping"?` · ${locality}`:""}</span>
      <strong>{shipping.kind==="free"?"Gratis":shipping.kind==="pickup"?"Sin envío":shipping.kind==="priced"?ars(shipping.shippingCost??0):"A confirmar"}</strong></div>
     <div className="cart-price-total"><span>{shipping.total!==null?"Total del pedido":"Total de productos"}</span><strong>{ars(shipping.total??subtotal)}</strong></div>
     {shipping.total===null?<p className="cart-total-pending" role="status">{shipping.kind==="unselected"?"Seleccioná tu zona para calcular el envío.":shipping.covered?"Todavía no hay una tarifa de envío cargada para esta zona. El costo se confirma por WhatsApp.":"Esta localidad está fuera de las zonas indicadas. Consultaremos cobertura y envío por WhatsApp."} El total final será el subtotal más el envío confirmado.</p>:<p className="cart-total-ready">{shipping.kind==="free"?"Tu compra tiene envío gratuito en esta zona.":shipping.kind==="pickup"?"Retiro sin costo de envío.":"Total calculado con la tarifa de entrega configurada."} Confirmamos la disponibilidad antes del pago.</p>}
    </section>
    {delivery==="shipping"?<label>Dirección de entrega (opcional)<input disabled={busy} maxLength={250} autoComplete="street-address" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Calle, altura y piso"/></label>:null}
    <label>Observaciones (opcional)<textarea disabled={busy} maxLength={350} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Horarios, preferencias de sabores, etc."/></label>

    <div className="whatsapp-payment-info">
     <strong>Pago por transferencia, coordinado por WhatsApp</strong>
     <p>{shipping.kind==="free"?`Tu compra alcanza el envío gratuito desde ${ars(Number(settings.free_shipping_threshold))} en la zona seleccionada.`:shipping.kind==="priced"?`El envío a ${locality} está cotizado en ${ars(shipping.shippingCost??0)}.`:delivery==="pickup"?"No se agrega costo de envío al retiro.":shipping.kind==="pending"?"El costo de envío se confirma por WhatsApp. No se suma una tarifa estimada sin verificar.":"Elegí tu zona para saber si corresponde envío gratuito o una tarifa."}</p>
    </div>
    {error?<p className="error" role="alert">{error}</p>:null}
    {unavailable?<p className="error" role="alert">Hay productos sin precio vigente o cantidades que superan el stock informado. Revisá las cantidades o quitá esos artículos.</p>:null}
    {lines.length>30?<p role="alert" className="error">Máximo 30 productos diferentes por solicitud. Quitá algunos para continuar.</p>:null}
    <button type="submit" className="btn primary full cart-submit" disabled={!canRequest||busy}>{busy?"Preparando pedido…":<>Pagar por WhatsApp <ArrowRight size={18}/></>}</button>
    {prepared?.selection===selection?<p role="status">Pedido {prepared.reference} preparado. <a href={prepared.url} rel="noopener noreferrer">Abrir WhatsApp para enviar el mensaje</a>. Si no lo enviás, seguirá pendiente de contacto.</p>:null}
    <p className="cart-form-footnote"><Truck size={16} aria-hidden="true"/> No hay cobros automáticos: por WhatsApp confirmamos stock y coordinamos la transferencia. {shipping.total===null?"El total con envío aún debe cotizarse.":""}</p><p className="hint">WhatsApp se abrirá con el mensaje listo para revisar y enviar. El carrito permanece guardado hasta que vos decidas vaciarlo.</p>
   </form>
  </div>
 </main></SiteShell>;
}
