"use client";

import Image from "next/image";
import {ArrowLeft,ArrowRight,ClipboardList,MessageCircle,Minus,Plus,ShoppingBag,Trash2,Truck} from "lucide-react";
import Link from "next/link";
import {useMemo,useRef,useState} from "react";
import {useCart} from "./cart";
import {SiteShell} from "./site-shell";
import {ars,DELIVERY_AREAS,type Product,type Settings,type ShippingZone} from "@/lib/types";
import {resolveCartView} from "@/lib/cart-view-model";
import {CATALOG_PRICE_ITEMS,type CatalogPriceItem} from "@/lib/catalog-prices";
import {checkoutRequestFingerprint,getOrCreateCheckoutKey,clearCheckoutKey,checkoutKeyStorage} from "@/lib/checkout-idempotency";
import {quoteShipping,freeShippingGoal,matchesPreparedShippingQuote,PICKUP_LOCALITY} from "@/lib/shipping-quote";
import {TurnstileChallenge} from "./turnstile-challenge";

export function Checkout({products,zones,settings,catalogItems=CATALOG_PRICE_ITEMS}:{products:Product[];zones:ShippingZone[];settings:Settings;demo:boolean;checkoutEnabled:boolean;catalogItems?:CatalogPriceItem[]}){
 const {items,setQuantity,clear}=useCart();
 const [fullName,setFullName]=useState("");
 const [selectedLocality,setSelectedLocality]=useState("");
 const [otherLocality,setOtherLocality]=useState("");
 const [address,setAddress]=useState("");
 const [notes,setNotes]=useState("");
 const [paymentPreference,setPaymentPreference]=useState<"transfer"|"cash_on_delivery">("transfer");
 const [delivery,setDelivery]=useState<"shipping"|"pickup">("shipping");
 const [turnstileToken,setTurnstileToken]=useState("");
 const [challengeVersion,setChallengeVersion]=useState(0);
 const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim()??"";
 const locality=delivery==="pickup"?PICKUP_LOCALITY:selectedLocality==="other"?otherLocality.trim():selectedLocality;
 const [error,setError]=useState("");
 const [busy,setBusy]=useState(false);
 const submitInFlight=useRef(false);
 const [prepared,setPrepared]=useState<{reference:string;url:string;selection:string}|null>(null);
 const [handled,setHandled]=useState<{reference:string;selection:string}|null>(null);
 const selection=JSON.stringify({items,fullName,locality,address,notes,delivery,paymentPreference});
 const {lines,count,subtotal,unavailable,missing,productsById}=useMemo(
  ()=>resolveCartView({items,products,catalogItems}),[items,products,catalogItems]
 );
 const shipping=quoteShipping({subtotal,locality,method:delivery,freeShippingThreshold:Number(settings.free_shipping_threshold),zones});
 const shippingGoal=freeShippingGoal({subtotal,locality,method:delivery,freeShippingThreshold:Number(settings.free_shipping_threshold),zones});
 const canRequest=!unavailable&&missing===0&&lines.length>0&&lines.length<=30&&fullName.trim().length>=2&&locality.trim().length>=2&&(!siteKey||Boolean(turnstileToken));

 async function sendRequest(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();
  if(submitInFlight.current||busy)return;
  if(handled?.selection===selection)return;
  setError("");
  setPrepared(null);
  if(!canRequest)return setError("Completá nombre y localidad, con un máximo de 30 productos diferentes.");
  submitInFlight.current=true;
  setBusy(true);
  try{
   const payload={
    customer_name:fullName,locality,address:delivery==="shipping"?address:"",notes,expected_subtotal:subtotal,
    shipping_method:delivery,payment_preference:paymentPreference,
    items:lines.map(({product,quantity})=>({id:product.id,quantity})),
    // Cotización que ve el usuario: el servidor exige concordancia antes de
    // guardar la solicitud; nunca se usa para calcular o confiar en precios.
    expected_shipping_kind:shipping.kind,
    expected_shipping_cost:shipping.shippingCost,
    expected_total:shipping.total,
   };
   // El token de Cloudflare vence y es de un solo uso; no debe cambiar la
   // identidad del pedido ni renovar la clave de idempotencia al reintentarlo.
   const body=JSON.stringify({...payload,turnstile_token:turnstileToken||undefined});
   const hash=await checkoutRequestFingerprint(JSON.stringify(payload));
   const key=getOrCreateCheckoutKey(hash,checkoutKeyStorage,()=>crypto.randomUUID());
   const res=await fetch("/api/whatsapp-request",{
    method:"POST",
    headers:{"Content-Type":"application/json","Idempotency-Key":key},
    body
   });
   const data=await res.json().catch(()=>({error:"El servidor devolvió una respuesta inválida"}));
   if(!res.ok){
    if(data.code==="REQUEST_ALREADY_HANDLED"){
     // Nunca renovar automáticamente la clave: el siguiente intento duplicaría una compra ya gestionada.
     if(typeof data.reference==="string")setHandled({reference:data.reference,selection});
     throw new Error("Este pedido ya está registrado y fue gestionado. No lo creamos otra vez.");
    }
    throw new Error(data.error||"No se pudo guardar la solicitud");
   }
   if(typeof data.reference!=="string"||typeof data.whatsapp_url!=="string"||!data.whatsapp_url.startsWith("https://wa.me/")||!data.whatsapp_url.includes("?text="))throw new Error("El enlace de WhatsApp no está disponible");
   if(typeof data.subtotal!=="number"||Math.abs(data.subtotal-subtotal)>0.009){
    setError("Los precios cambiaron al preparar el pedido. Actualizá el carrito para revisar el subtotal antes de enviarlo.");
    return;
   }
   if(!matchesPreparedShippingQuote(data,shipping)){
    setError("El importe o las condiciones del envío cambiaron. Actualizá el carrito y revisá el total antes de enviar el mensaje.");
    return;
   }
   setPrepared({reference:data.reference,url:data.whatsapp_url,selection});
   // Se guarda solo la preparación del mensaje. No se afirma que se envió ni se cobró.
   window.location.assign(data.whatsapp_url);
  }catch(reason){
   setError(reason instanceof Error?reason.message:"No se pudo registrar la solicitud.");
  }finally{submitInFlight.current=false;setBusy(false);if(siteKey){setTurnstileToken("");setChallengeVersion(v=>v+1);}}
 }

 return <SiteShell settings={settings} hideFloatingActions><main className="shell checkout-page checkout-refresh">
  <div className="cart-page-heading cart-experience-heading">
   <div className="cart-heading-top"><Link className="cart-back-link" href="/catalogo"><ArrowLeft size={17}/> Volver al catálogo</Link></div>
   <p className="kicker">TU PEDIDO · VIAGELATO</p>
   <h1>Tu carrito<span className="cart-count-heading">{count}</span></h1>
   <p>Elegí tus productos, seleccioná la entrega y terminá el pedido por WhatsApp.</p>
   <ol className="cart-progress" aria-label="Cómo hacer el pedido">
    <li><span>01</span><strong>Productos</strong></li><li><span>02</span><strong>Entrega y pago</strong></li><li><span>03</span><strong>Confirmación por WhatsApp</strong></li>
   </ol>
  </div>
  <div className="checkout-grid refined-cart-grid cart-experience-grid">
   <div>
    <section className="panel cart-products-panel" aria-label="Productos seleccionados">
     <div className="cart-panel-heading"><div><p className="kicker">01 / REVISÁ TU ELECCIÓN</p><h2>Productos seleccionados</h2></div><span>{count} {count===1?"unidad":"unidades"}</span></div>
     {missing>0?<div className="cart-missing-alert" role="alert"><strong>Hay {missing} {missing===1?"producto que ya no está":"productos que ya no están"} disponible{missing===1?"":"s"}.</strong><p>Revisá tu selección antes de preparar el pedido. No quitamos artículos sin avisarte.</p><button type="button" disabled={busy} onClick={()=>items.filter(item=>!productsById.has(item.id)).forEach(item=>setQuantity(item.id,0))}>Quitar artículos no disponibles</button></div>:null}
     {!lines.length?<div className="cart-empty"><ShoppingBag size={32} aria-hidden="true"/><h3>Tu carrito está vacío.</h3><p>Encontrá tus helados favoritos en el catálogo.</p><Link className="primary-action" href="/catalogo">Explorar catálogo <ArrowRight size={18}/></Link></div>:lines.map(({product,quantity})=><article className={`cart-item cart-line ${product.stock!==null&&quantity>product.stock?"cart-line-invalid":""}`} key={product.id}>
      <div className="mini-art cart-line-art">{product.image_url?<Image src={product.image_url} alt={product.name} fill sizes="(max-width:640px) 74px, 96px" unoptimized/>:<ShoppingBag size={24} aria-hidden="true"/>}</div>
      <div className="cart-meta">
       <strong>{product.name}</strong>
       <small>{product.presentation??"Por presentación"}</small><strong className="cart-unit-price">{ars(Number(product.price))}</strong>
       {product.stock!==null&&product.stock<=5?<small className="cart-stock-notice">{product.stock===0?"Sin stock":`Últimas ${product.stock} unidades`}</small>:null}
      </div>
      <div className="cart-line-controls">
       <div className="qty" aria-label={`Cantidad de ${product.name}`}>
        <button type="button" disabled={busy||quantity<=1} onClick={()=>setQuantity(product.id,quantity-1)} aria-label={`Quitar una presentación de ${product.name}`}><Minus size={16}/></button>
        <span aria-live="polite" aria-label={`${quantity} presentaciones`}>{quantity}</span>
        <button type="button" disabled={busy||quantity>=Math.min(product.stock??99,99)} onClick={()=>setQuantity(product.id,quantity+1)} aria-label={`Agregar una presentación de ${product.name}`}><Plus size={16}/></button>
       </div>
       <div className="cart-line-actions"><strong>{ars(Number(product.price)*quantity)}</strong><button className="remove-cart" type="button" disabled={busy} onClick={()=>setQuantity(product.id,0)} aria-label={`Eliminar ${product.name} del carrito`}><Trash2 size={15}/> Quitar</button></div>
      </div>
     </article>)}
     {lines.length?<div className="cart-checkout-tools"><Link href="/catalogo" className="text-link">Seguir agregando productos</Link><button type="button" className="remove-cart" disabled={busy} onClick={()=>{if(window.confirm("¿Vaciar el carrito? Se quitarán todos los productos seleccionados."))clear();}}><Trash2 size={15}/> Vaciar carrito</button></div>:null}
    </section>
    {lines.length>0?<section className={`cart-shipping-goal cart-shipping-goal-${shippingGoal.kind}`} aria-label="Beneficio de envío gratis">
     <div className="cart-shipping-goal-content"><Truck size={19} aria-hidden="true"/><div>
      <strong>{shippingGoal.kind==="remaining"?`Te faltan ${ars(Math.ceil(shippingGoal.remaining))} para el envío gratis`:shippingGoal.kind==="reached"?"¡Tu compra tiene envío gratis!":shippingGoal.kind==="pickup"?"Retiro en el local sin cargo":shippingGoal.kind==="choose_zone"?"Elegí tu zona para revisar el envío gratis":"Envío gratuito no disponible en esta localidad"}</strong>
      <p>{shippingGoal.kind==="remaining"?`El beneficio se aplica en ${locality} desde ${ars(shippingGoal.threshold)} en productos.`:shippingGoal.kind==="reached"?`Alcanzaste el mínimo de ${ars(shippingGoal.threshold)} en ${locality}. La entrega se confirma por WhatsApp.`:shippingGoal.kind==="pickup"?"El retiro es gratis y no tiene compra mínima. Coordinamos el horario por WhatsApp.":shippingGoal.kind==="choose_zone"?"El envío sin cargo depende del monto de productos y de la localidad elegida.":"Fuera de las zonas habilitadas, se consulta cobertura y costo por WhatsApp. No se suma una tarifa automática."}</p>
     </div></div>
     {shippingGoal.kind==="remaining"?<div className="cart-shipping-goal-track" role="progressbar" aria-label="Progreso para envío gratis" aria-valuemin={0} aria-valuemax={100} aria-valuenow={shippingGoal.percentage} aria-valuetext={`Faltan ${ars(Math.ceil(shippingGoal.remaining))}`}><span style={{width:`${shippingGoal.percentage}%`}}/></div>:null}
    </section>:null}
    {lines.length>0?<a className="cart-continue-link" href="#datos-pedido">Continuar con el pedido <ArrowRight size={18} aria-hidden="true"/></a>:null}
   </div>
   <form id="datos-pedido" className="panel cart-form-panel cart-order-form" onSubmit={sendRequest}>
    <div className="cart-form-heading"><p className="kicker">02 / PREPARÁ TU PEDIDO</p><ClipboardList size={22} aria-hidden="true"/><h2>Entrega y pago</h2></div>
    <label>Nombre y apellido<input disabled={busy} required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={e=>setFullName(e.target.value)}/></label>
    {settings.pickup_enabled?<label>Tipo de entrega<select disabled={busy} value={delivery} onChange={e=>setDelivery(e.target.value as "shipping"|"pickup")}><option value="shipping">Envío a domicilio</option><option value="pickup">Retiro en el local — gratis</option></select></label>:null}
    {delivery==="shipping"?<>
    <label>Zona de entrega<select disabled={busy} required value={selectedLocality} onChange={e=>setSelectedLocality(e.target.value)}>
     <option value="">Elegí tu localidad</option>
     {DELIVERY_AREAS.map(area=><option key={area} value={area}>{area}</option>)}
     <option value="other">Fuera de las zonas indicadas / Otra localidad</option>
    </select></label>
    {selectedLocality==="other"?<label>Escribí tu localidad<input disabled={busy} required minLength={2} maxLength={100} autoComplete="address-level2" aria-label="Escribí tu localidad" value={otherLocality} onChange={e=>setOtherLocality(e.target.value)} placeholder="Por ejemplo: Quilmes" aria-describedby="other-locality-help"/><small id="other-locality-help">Fuera de las zonas habilitadas, consultamos cobertura, costo y fecha por WhatsApp. No hay una tarifa fija general.</small></label>:null}
    </>:<p className="cart-total-ready" role="status"><strong>Retiro en el local, sin cargo.</strong> Dirección: {settings.address||"Eva Perón 3050, Lanús Este"}. Coordinamos por WhatsApp el horario y la disponibilidad.</p>}
    <section className="cart-price-breakdown" aria-label="Resumen y total del pedido" aria-live="polite">
     <div className="cart-price-breakdown-title"><h3>Tu total</h3><span>{count} {count===1?"presentación":"presentaciones"}</span></div>
     <div className="cart-price-row"><span>Productos</span><strong>{ars(subtotal)}</strong></div>
     <div className="cart-price-row"><span>{delivery==="pickup"?"Retiro en local":`Envío${locality?` · ${locality}`:""}`}</span>
      <strong>{shipping.kind==="free"?"Gratis":shipping.kind==="pickup"?"Sin envío":shipping.kind==="priced"?ars(shipping.shippingCost??0):"A confirmar"}</strong></div>
     <div className="cart-price-total"><span>{shipping.total!==null?"Total del pedido":"Total de productos"}</span><strong>{ars(shipping.total??subtotal)}</strong></div>
     {shipping.total===null?<p className="cart-total-pending" role="status">{shipping.kind==="unselected"?"Seleccioná tu zona para calcular el envío.":shipping.covered?"El costo del envío se confirma por WhatsApp.":"Entrega y costo a confirmar por WhatsApp."} El total final será el subtotal más el envío confirmado.</p>:<p className="cart-total-ready">{shipping.kind==="free"?"Tu compra tiene envío gratuito en esta zona.":shipping.kind==="pickup"?"Retiro sin costo de envío.":shipping.covered?"Total calculado con la tarifa de entrega configurada.":"Envío incluido en el total."} Confirmamos la disponibilidad antes del pago.</p>}
    </section>
    <fieldset className="cart-payment-methods">
     <legend>Forma de pago preferida</legend>
     <div className="cart-payment-options">
      <label className={paymentPreference==="transfer"?"cart-payment-option selected":"cart-payment-option"}>
       <input disabled={busy} type="radio" name="paymentPreference" value="transfer" checked={paymentPreference==="transfer"} onChange={()=>setPaymentPreference("transfer")}/>
       <span><strong>Transferencia bancaria</strong><small>Coordinamos los datos por WhatsApp.</small></span>
      </label>
      <label className={paymentPreference==="cash_on_delivery"?"cart-payment-option selected":"cart-payment-option"}>
       <input disabled={busy} type="radio" name="paymentPreference" value="cash_on_delivery" checked={paymentPreference==="cash_on_delivery"} onChange={()=>setPaymentPreference("cash_on_delivery")}/>
       <span><strong>{delivery==="pickup"?"Efectivo al retirar":"Efectivo al recibir"}</strong><small>Sujeto a confirmación de Viagelato.</small></span>
      </label>
     </div>
     
    </fieldset>
    {delivery==="shipping"?<label>Dirección de entrega (opcional)<input disabled={busy} maxLength={250} autoComplete="street-address" value={address} onChange={e=>setAddress(e.target.value)} placeholder="Calle, altura y piso"/></label>:null}
    <label>Observaciones (opcional)<textarea disabled={busy} maxLength={350} rows={3} aria-describedby="viagelato-flavor-guidance" value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Ej.: Giovi de frutilla, Carita chocolate-vainilla, horario de entrega…"/><small id="viagelato-flavor-guidance">Si elegiste productos con diferentes variedades, indicá el sabor preferido. Confirmamos disponibilidad por WhatsApp.</small></label>

    {error?<p className="error" role="alert">{error}</p>:null}
    {unavailable?<p className="error" role="alert">Hay productos sin precio vigente o cantidades que superan el stock informado. Revisá las cantidades o quitá esos artículos.</p>:null}
    {lines.length>30?<p role="alert" className="error">Máximo 30 productos diferentes por solicitud. Quitá algunos para continuar.</p>:null}
    {siteKey?<TurnstileChallenge key={challengeVersion} siteKey={siteKey} action="whatsapp_request" onTokenChange={setTurnstileToken}/>:null}
    <button type="submit" className="btn primary full cart-submit" disabled={!canRequest||busy||handled?.selection===selection}>{busy?"Preparando pedido…":<><MessageCircle size={20} aria-hidden="true"/> Pagar por WhatsApp <ArrowRight size={18} aria-hidden="true"/></>}</button>
    {handled?.selection===selection?<div className="cart-existing-order" role="status"><strong>Solicitud {handled.reference} ya gestionada.</strong><p>Tu pedido anterior sigue registrado. No vuelvas a enviarlo por error. Si querés hacer otro pedido con estos productos, iniciá una solicitud nueva.</p><button type="button" disabled={busy} onClick={()=>{if(!window.confirm("¿Crear otro pedido distinto con estos mismos productos? Si no necesitás otra compra, cancelá."))return;clearCheckoutKey(checkoutKeyStorage);setHandled(null);setPrepared(null);setError("");}}>Iniciar un pedido nuevo</button></div>:null}
    {prepared?.selection===selection?<p role="status">Pedido {prepared.reference} preparado. <a href={prepared.url} rel="noopener noreferrer">Abrir WhatsApp para enviar el mensaje</a>. Si no lo enviás, seguirá pendiente de contacto.</p>:null}
    <p className="cart-form-footnote"><Truck size={16} aria-hidden="true"/> Confirmamos stock y entrega antes del pago.</p>
   </form>
  </div>
 </main></SiteShell>;
}
