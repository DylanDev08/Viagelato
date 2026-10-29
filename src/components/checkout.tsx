"use client";

import Image from "next/image";
import Link from "next/link";
import {useMemo,useState} from "react";
import {useCart} from "./cart";
import {SiteShell} from "./site-shell";
import {ars,DELIVERY_AREAS,type Product,type Settings,type ShippingZone} from "@/lib/types";
import {PRICED_CART_PRODUCTS,whatsappCartMessage} from "@/lib/whatsapp-cart";
import {whatsappHref} from "@/lib/whatsapp";

type DisplayItem={
 id:string;name:string;sku?:string|null;presentation?:string|null;
 price:number;image_url:string|null;stock:number|null;
};

export function Checkout({products,settings}:{products:Product[];zones:ShippingZone[];settings:Settings;demo:boolean;checkoutEnabled:boolean}){
 const {items,setQuantity,clear}=useCart();
 const [fullName,setFullName]=useState("");
 const [locality,setLocality]=useState("");
 const [address,setAddress]=useState("");
 const [notes,setNotes]=useState("");
 const [delivery,setDelivery]=useState<"shipping"|"pickup">("shipping");
 const [error,setError]=useState("");
 const productMap=useMemo(()=>new Map<string,DisplayItem>([
  ...products.map(product=>[product.id,{id:product.id,name:product.name,sku:product.sku,presentation:product.presentation,price:Number(product.price),image_url:product.image_url,stock:product.stock}] as const),
  ...PRICED_CART_PRODUCTS.map(product=>[product.id,product] as const),
 ]),[products]);
 const lines=useMemo(()=>items.flatMap(item=>{
  const product=productMap.get(item.id);
  return product?[{product,quantity:item.quantity}]:[];
 }),[items,productMap]);
 const count=lines.reduce((sum,line)=>sum+line.quantity,0);
 const subtotal=lines.reduce((sum,line)=>sum+Number(line.product.price)*line.quantity,0);
 const missing=items.length-lines.length;
 const eligible=DELIVERY_AREAS.some(area=>area===locality);
 const canRequest=lines.length>0&&fullName.trim().length>=2&&locality.trim().length>=2;
 const promo=delivery==="shipping"&&eligible&&subtotal>=Number(settings.free_shipping_threshold);

 function sendRequest(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  setError("");
  if(!canRequest)return setError("Completá nombre y localidad antes de continuar.");
  try{
   const message=whatsappCartMessage(lines.map(({product,quantity})=>({
    name:product.name,sku:product.sku,presentation:product.presentation,
    price:Number(product.price),quantity
   })),{
    name:fullName,locality,address,notes,shippingMethod:delivery,
    freeShippingThreshold:Number(settings.free_shipping_threshold)
   });
   const url=whatsappHref(settings.whatsapp,message);
   // Un wa.link sin parámetros no transporta el detalle. Nunca enviamos un pedido vacío.
   if(!url||!url.includes("?text="))return setError("Configurá un número de WhatsApp internacional válido en el panel para enviar el detalle del pedido.");
   window.location.assign(url);
  }catch(reason){
   setError(reason instanceof Error?reason.message:"No se pudo preparar el mensaje.");
  }
 }

 return <SiteShell settings={settings}><main className="container checkout-page">
  <Link href="/catalogo">← Volver al catálogo</Link>
  <h1>Tu carrito</h1>
  <p className="hint">Elegí las cantidades de cada caja o presentación. El pago y la entrega se coordinan por WhatsApp; la web no cobra ni genera pedidos automáticos.</p>
  <div className="checkout-grid">
   <div>
    <section className="panel" aria-label="Productos seleccionados">
     <h2>Productos</h2>
     {missing>0?<p className="hint" role="status">Algunos artículos guardados ya no están en el catálogo. No se incluirán en la solicitud.</p>:null}
     {!lines.length?<div><p>Tu carrito está vacío.</p><Link className="text-link" href="/catalogo">Explorar productos →</Link></div>:lines.map(({product,quantity})=><article className="cart-item" key={product.id}>
      <div className="mini-art">{product.image_url?<Image src={product.image_url} alt={product.name} fill sizes="56px" unoptimized/>:""}</div>
      <div className="cart-meta">
       <strong>{product.name}</strong>
       <small>{product.presentation??"Por presentación"} · {ars(Number(product.price))}</small>
       {product.sku?<small>SKU: {product.sku}</small>:null}
       <small>Stock a confirmar por WhatsApp</small>
       <button className="remove-cart" type="button" onClick={()=>setQuantity(product.id,0)}>Eliminar</button>
      </div>
      <div className="qty">
       <button type="button" disabled={quantity<=1} onClick={()=>setQuantity(product.id,quantity-1)} aria-label={`Quitar una presentación de ${product.name}`}>−</button>
       <span aria-label={`${quantity} presentaciones`}>{quantity}</span>
       <button type="button" disabled={quantity>=99} onClick={()=>setQuantity(product.id,quantity+1)} aria-label={`Agregar una presentación de ${product.name}`}>+</button>
      </div>
     </article>)}
     {lines.length?<div className="cart-checkout-tools"><Link href="/catalogo" className="text-link">Seguir agregando productos</Link><button type="button" className="remove-cart" onClick={clear}>Vaciar carrito</button></div>:null}
    </section>
    <section className="panel" aria-label="Resumen de pedido">
     <h2>Resumen</h2>
     <div className="totals">
      <p><span>Presentaciones</span><strong>{count}</strong></p>
      <p><span>Subtotal de productos</span><strong>{ars(subtotal)}</strong></p>
      <p><span>Envío</span><strong>{promo?"Promoción a confirmar":"A coordinar"}</strong></p>
      <hr/>
      <p><span>Total final</span><strong>Se confirma por WhatsApp</strong></p>
     </div>
     <p className="hint">Los precios corresponden a cajas, baldes o envases completos. No se reserva mercadería hasta que Viagelato confirme tu solicitud.</p>
    </section>
   </div>
   <form className="panel" onSubmit={sendRequest}>
    <h2>Finalizar por WhatsApp</h2>
    <p className="hint">Completá estos datos para enviarle a Viagelato el resumen del carrito. No se guardan en una orden online ni se realiza ningún cobro en esta página.</p>
    <label>Nombre y apellido<input required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)}/></label>
    <label>Localidad<select required value={locality} onChange={e=>setLocality(e.target.value)}>
     <option value="">Elegí tu localidad</option>
     {DELIVERY_AREAS.map(area=><option key={area} value={area}>{area}</option>)}
     <option value="Otra localidad">Otra localidad (consultar cobertura)</option>
    </select></label>
    {settings.pickup_enabled?<label>Entrega<select value={delivery} onChange={e=>setDelivery(e.target.value as "shipping"|"pickup")}><option value="shipping">Envío a domicilio</option><option value="pickup">Consultar retiro</option></select></label>:null}
    {delivery==="shipping"?<label>Dirección de entrega (opcional)<input maxLength={250} autoComplete="street-address" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Calle, altura y piso"/></label>:null}
    <label>Observaciones (opcional)<textarea maxLength={350} rows={3} value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Horarios, preferencias de sabores, etc."/></label>
    <div className="whatsapp-payment-info">
     <strong>Pago por transferencia, coordinado por WhatsApp</strong>
     <p>{promo?`Tu subtotal supera ${ars(settings.free_shipping_threshold)} en una localidad elegible. Solicitaremos la promoción de envío gratuito, sujeta a confirmación.`:"Te confirmamos el costo de entrega y la disponibilidad antes de solicitar la transferencia."}</p>
    </div>
    {error?<p className="error" role="alert">{error}</p>:null}
    <button type="submit" className="btn primary full" disabled={!canRequest}>Enviar pedido por WhatsApp</button>
    <p className="hint">WhatsApp se abrirá con el mensaje listo para revisar y enviar. El carrito permanece guardado hasta que vos decidas vaciarlo.</p>
   </form>
  </div>
 </main></SiteShell>;
}
