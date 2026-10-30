"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import {useRouter} from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {LayoutDashboard,Package,Layers,Truck,Image as ImageIcon,Settings,ShoppingBag,MessageCircle,ExternalLink,LogOut,UploadCloud,Menu,X} from "lucide-react";
import {browserDb} from "@/lib/browser";
import {WhatsAppRequests} from "@/components/admin-whatsapp-requests";
import {normalizeCatalogText} from "@/lib/catalog-search";
import {nextOrderStep,orderStatusLabel} from "@/lib/order-ui";
import {publicationMissingFields} from "@/lib/product-publication";
import {PROVISIONAL_PRODUCT_ASSETS} from "@/lib/provisional-catalog";
import {draftFromCatalogCandidate} from "@/lib/catalog-draft";
import {CATALOG_PRICE_ITEMS} from "@/lib/catalog-prices";
import {draftFromPricedCatalog} from "@/lib/catalog-product-draft";
import {ars,type Product,type Category,type Settings as StoreSettings,type ShippingZone,type Order,type Banner,type WhatsAppRequest} from "@/lib/types";
type Tab="overview"|"products"|"categories"|"zones"|"banners"|"settings"|"orders"|"requests";
type Draft=Pick<Product,"name"|"slug"|"description"|"price"|"stock"|"image_url"|"category_id"|"sku"|"presentation"|"featured"|"commercially_verified"|"catalog_visible"|"active"> & {id?:string};
const empty:Draft={name:"",slug:"",description:"",price:0,stock:0,image_url:null,category_id:null,sku:"",presentation:"",featured:false,commercially_verified:false,catalog_visible:false,active:false};
const nav:{id:Tab;label:string;icon:typeof Package}[]=[
 {id:"overview",label:"Resumen",icon:LayoutDashboard},{id:"products",label:"Productos",icon:Package},{id:"categories",label:"Categorías",icon:Layers},{id:"orders",label:"Pedidos online",icon:ShoppingBag},{id:"requests",label:"Pedidos por WhatsApp",icon:MessageCircle},{id:"zones",label:"Zonas de envío",icon:Truck},{id:"banners",label:"Imágenes de portada",icon:ImageIcon},{id:"settings",label:"Datos de la tienda",icon:Settings}
];
const mobileMainTabs:Tab[]=["overview","products","requests","orders"];
const mobileMoreTabs:Tab[]=["categories","zones","banners","settings"];
function friendlyIssue(issue:{path?:(string|number)[];message?:string}|undefined){
 if(!issue)return "";
 if(issue.path?.[0]==="active"&&issue.message?.startsWith("Para publicar"))return issue.message;
 const labels:Record<string,string>={name:"nombre",slug:"enlace de la ficha",description:"descripción",price:"precio",stock:"unidades disponibles",image_url:"foto",sku:"código SKU",category_id:"categoría",whatsapp:"WhatsApp",transfer_enabled:"datos para transferencia"};
 const key=String(issue.path?.[0]??"");
 return labels[key]?`Revisá el campo «${labels[key]}».`:"Revisá los datos ingresados.";
}
async function request(path:string,method:string,data?:unknown){
 const r=await fetch(`/api/admin/${path}`,{method,headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});
 const d=await r.json().catch(()=>({error:"El servidor devolvió una respuesta inválida"}));
 if(!r.ok)throw new Error([d.error||"No se pudo completar la operación",friendlyIssue(d.issues?.[0])].filter(Boolean).join(" · "));
 return d;
}
export function AdminDashboard({initialProducts,initialCategories,initialOrders,initialWhatsAppRequests=[],initialZones,initialSettings,initialBanners}:{initialProducts:Product[];initialCategories:Category[];initialOrders:Order[];initialWhatsAppRequests?:WhatsAppRequest[];initialZones:ShippingZone[];initialSettings:StoreSettings;initialBanners:Banner[]}){
 const [tab,setTab]=useState<Tab>("overview"),[mobileMoreOpen,setMobileMoreOpen]=useState(false),[draft,setDraft]=useState<Draft>({...empty}),[settings,setSettings]=useState(initialSettings),[notice,setNotice]=useState(""),[noticeError,setNoticeError]=useState(false),[busy,setBusy]=useState(false);
 const [productQuery,setProductQuery]=useState(""),[productStatus,setProductStatus]=useState<"all"|"published"|"hidden"|"pending">("all");
 const [savedDraft,setSavedDraft]=useState<Draft>({...empty});
 const [savedSettings,setSavedSettings]=useState<StoreSettings>(initialSettings);
 const productHasChanges=useMemo(()=>JSON.stringify(draft)!==JSON.stringify(savedDraft),[draft,savedDraft]);
 const settingsHaveChanges=useMemo(()=>JSON.stringify(settings)!==JSON.stringify(savedSettings),[settings,savedSettings]);
 useEffect(()=>{
  if(!productHasChanges&&!settingsHaveChanges)return;
  const warn=(e:BeforeUnloadEvent)=>{e.preventDefault();e.returnValue="";};
  window.addEventListener("beforeunload",warn);
  return ()=>window.removeEventListener("beforeunload",warn);
 },[productHasChanges,settingsHaveChanges]);
 function canLeaveEditor(next:Tab){
  if(tab==="products"&&next!=="products"&&productHasChanges){
   if(!window.confirm("Hay cambios sin guardar en el producto. ¿Salir y descartarlos?"))return false;
   setDraft({...savedDraft});
  }
  if(tab==="settings"&&next!=="settings"&&settingsHaveChanges){
   if(!window.confirm("Hay cambios sin guardar en la configuración. ¿Salir sin guardarlos?"))return false;
   setSettings({...savedSettings});
  }
  return true;
 }
 function changeTab(next:Tab){if(next!==tab&&!canLeaveEditor(next))return;setTab(next);setMobileMoreOpen(false);}
 async function saveProduct(mode:"save"|"publish") {
  const next:Draft={...draft,price:Number(draft.price),stock:Number(draft.stock),
   active:mode==="publish"?true:Boolean(draft.active),
   catalog_visible:mode==="publish"?false:Boolean(draft.catalog_visible)};
  const issues=[...(!next.name.trim()||next.name.trim().length<2?["nombre del producto"]:[]),...(!/^[a-z0-9-]{2,160}$/.test(next.slug)?["enlace de la ficha"]:[]),...publicationMissingFields(next)];
  if(next.active&&issues.length){
   setNoticeError(true);
   setNotice("Para publicar, completá: "+issues.join(", ")+".");
   return;
  }
  await act(async()=>{
   const saved=await request("products",next.id?"PATCH":"POST",next);
   // La respuesta debe confirmar los campos comerciales. No indicar éxito si no persistieron.
   if(!saved||typeof saved.id!=="string"||Number(saved.price)!==next.price||
      Number(saved.stock)!==next.stock||Boolean(saved.active)!==next.active||
      Boolean(saved.catalog_visible)!==next.catalog_visible||
      (saved.image_url||null)!==(next.image_url?.trim()||null)){
    throw new Error("El servidor no confirmó precio, stock, foto y visibilidad. Actualizá el panel antes de intentar nuevamente.");
   }
   const persisted:Draft={...next,...saved,price:Number(saved.price),stock:Number(saved.stock)};
   setDraft(persisted);
   setSavedDraft({...persisted});
  },true,mode==="publish"?"Producto publicado correctamente":next.active?"Producto actualizado en la tienda":next.catalog_visible?"Producto guardado y visible en el catálogo":"Borrador guardado. Podés seguir editándolo.");
 }
 async function hideProduct(product:Product){
  if(busy)return;
  if(draft.id===product.id&&productHasChanges&&
     !window.confirm("Hay cambios sin guardar en esta ficha. ¿Descartarlos para ocultar el producto?"))return;
  if(!window.confirm(`¿Ocultar «${product.name}»? Dejará de aparecer en la tienda.`))return;
  await act(async()=>{
   await request("products","DELETE",{id:product.id});
   if(draft.id===product.id){
    const hidden:Draft={...product,price:Number(product.price),stock:Number(product.stock),
      active:false,catalog_visible:false};
    setDraft(hidden);setSavedDraft({...hidden});
   }
  },true,"Producto oculto correctamente");
 }
 function startProduct(value:Draft){
  if(productHasChanges&&!window.confirm("Hay cambios sin guardar. ¿Descartarlos y abrir otra ficha?"))return;
  const snapshot={...value};
  setDraft(snapshot);setSavedDraft({...snapshot});
  setNotice("");setNoticeError(false);
 }

 const [showCatalogPicker,setShowCatalogPicker]=useState(false),[catalogQuery,setCatalogQuery]=useState(""),[catalogType,setCatalogType]=useState("all");
 const [showCandidatePicker,setShowCandidatePicker]=useState(false),[candidateQuery,setCandidateQuery]=useState("");
 const [newCat,setNewCat]=useState({name:"",slug:"",id:""}),[zoneId,setZoneId]=useState(""),[zoneName,setZoneName]=useState(""),[zoneCodes,setZoneCodes]=useState(""),[zoneCost,setZoneCost]=useState(""),[zoneReady,setZoneReady]=useState(false),[zoneFree,setZoneFree]=useState(false),[banner,setBanner]=useState({id:"",title:"",subtitle:"",image_url:"",href:"/catalogo",active:true,sort_order:0});
 const router=useRouter();
 useEffect(()=>{
  if(!mobileMoreOpen)return;
  function closeOnEscape(event:KeyboardEvent){if(event.key==="Escape")setMobileMoreOpen(false);}
  window.addEventListener("keydown",closeOnEscape);
  return ()=>window.removeEventListener("keydown",closeOnEscape);
 },[mobileMoreOpen]);

 async function act(fn:()=>Promise<unknown>,refresh=true,successMessage="Cambios guardados correctamente"){setBusy(true);setNotice("");setNoticeError(false);try{await fn();setNotice(successMessage);if(refresh)router.refresh();}catch(e){setNoticeError(true);setNotice(e instanceof Error?e.message:"No se pudo guardar");}finally{setBusy(false);}}
 const slugify=(name:string)=>name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9 ]/g,"").trim().replace(/\s+/g,"-");
 function updateDraft<K extends keyof Draft>(field:K,val:Draft[K]){setDraft(v=>({...v,[field]:val}));}
 async function upload(file:File,field:"product"|"logo"|"hero"|"banner"){
  setNotice("");setNoticeError(false);
  if(file.size===0||file.size>3_000_000||!["image/jpeg","image/png","image/webp"].includes(file.type)){
   setNoticeError(true);setNotice("Elegí una imagen JPG, PNG o WEBP de hasta 3 MB.");return;
  }
  setBusy(true);try{const body=new FormData();body.append("file",file);const r=await fetch("/api/admin/upload",{method:"POST",body});const d=await r.json().catch(()=>({error:"Respuesta inválida del servidor"}));if(!r.ok||typeof d.url!=="string")throw new Error(d.error||"No se pudo subir la imagen");if(field==="product")setDraft(v=>({...v,image_url:d.url}));else if(field==="banner")setBanner(v=>({...v,image_url:d.url}));else setSettings(v=>({...v,[field==="logo"?"logo_url":"hero_image_url"]:d.url}));setNotice("Imagen subida. Guardá el formulario para publicarla.");}catch(e){setNoticeError(true);setNotice(e instanceof Error?e.message:"Error al subir foto");}finally{setBusy(false);}
 }
 function uploader(field:"product"|"logo"|"hero"|"banner"){return <label className="upload-label"><UploadCloud size={16}/> Subir imagen<input type="file" accept="image/png,image/jpeg,image/webp" hidden disabled={busy} onChange={e=>{const f=e.target.files?.[0];e.target.value="";if(f)void upload(f,field);}}/></label>}
 async function logout(){if(!canLeaveEditor("overview"))return;await browserDb().auth.signOut();router.replace("/login");router.refresh();}
 const publicationIssues=[
  ...(!draft.name.trim()||draft.name.trim().length<2?["nombre del producto"]:[]),
  ...(!/^[a-z0-9-]{2,160}$/.test(draft.slug)?["enlace de la ficha"]:[]),
  ...publicationMissingFields(draft)
 ];
 const candidateResults=useMemo(()=>PROVISIONAL_PRODUCT_ASSETS.filter(asset=>
  normalizeCatalogText(`${asset.name} ${asset.category}`).includes(normalizeCatalogText(candidateQuery))
 ),[candidateQuery]);
 const savedSkus=useMemo(()=>new Set(initialProducts.map(p=>p.sku?.toLowerCase()).filter(Boolean)),[initialProducts]);
 const catalogTypes=useMemo(()=>[...new Set(CATALOG_PRICE_ITEMS.map(item=>item.category))],[ ]);
 const catalogMatches=useMemo(()=>CATALOG_PRICE_ITEMS.filter(item=>
  (catalogType==="all"||item.category===catalogType)&&
  normalizeCatalogText(`${item.name} ${item.sku} ${item.presentation} ${item.category}`).includes(normalizeCatalogText(catalogQuery))
 ),[catalogType,catalogQuery]);
 const usedCandidateImages=useMemo(()=>new Set(initialProducts.map(product=>product.image_url).filter(Boolean)),[initialProducts]);
 function chooseCandidate(asset:(typeof PROVISIONAL_PRODUCT_ASSETS)[number]){
  if(usedCandidateImages.has(asset.image))return;
  if(productHasChanges&&!window.confirm("Hay cambios sin guardar. ¿Descartarlos para usar esta imagen?"))return;
  const candidate=draftFromCatalogCandidate(asset,initialCategories);
  setDraft(candidate);setSavedDraft({...empty});
  setShowCandidatePicker(false);
  setNotice("Ficha provisional preparada como borrador. Completá los datos comerciales antes de publicarla.");
  setNoticeError(false);
 }
 const filteredProducts=useMemo(()=>initialProducts.filter(p=>{
  const matchesQuery=normalizeCatalogText(`${p.name} ${p.sku??""} ${p.slug}`).includes(normalizeCatalogText(productQuery));
  const matchesStatus=productStatus==="all"||(productStatus==="published"&&(p.active||p.catalog_visible))||
   (productStatus==="hidden"&&!p.active&&!p.catalog_visible)||(productStatus==="pending"&&!p.commercially_verified);
  return matchesQuery&&matchesStatus;
 }),[initialProducts,productQuery,productStatus]);
 return <div className="admin-shell"><aside className="admin-side"><h2>Viagelato<span>Administración</span></h2><nav aria-label="Panel de administración">{nav.map(n=><button key={n.id} disabled={busy} aria-pressed={tab===n.id} onClick={()=>changeTab(n.id)} className={tab===n.id?"active":""}><n.icon size={18}/>{n.label}</button>)}</nav><div className="admin-side-bottom"><Link href="/" target="_blank" rel="noreferrer"><ExternalLink size={17}/> Ver tienda como cliente</Link><button disabled={busy} onClick={logout}><LogOut size={17}/> Cerrar sesión</button></div></aside>
 <main className="admin-main" aria-busy={busy}><div className="admin-bar"><div><small>PANEL DE ADMINISTRACIÓN</small><h1>{nav.find(n=>n.id===tab)?.label}</h1><p className="admin-tab-help">{({overview:"Consultá el estado de la tienda y elegí qué gestionar.",products:"Cargá productos, revisá precios y decidí cuáles se muestran.",categories:"Organizá los productos para que los clientes los encuentren fácilmente.",orders:"Revisá las compras realizadas mediante el sistema de pedidos online.",requests:"Gestioná los pedidos preparados para WhatsApp y su seguimiento.",zones:"Configurá dónde hacés entregas y sus condiciones.",banners:"Cambiá las imágenes promocionales que aparecen en la tienda.",settings:"Actualizá los datos de contacto, medios de pago y contenido comercial."} satisfies Record<Tab,string>)[tab]}</p></div><Link href="/" target="_blank" rel="noreferrer" className="btn ghost"><ExternalLink size={17}/> Vista cliente</Link></div>{notice&&<div className={`notification ${noticeError?"notification-error":""}`} role={noticeError?"alert":"status"} aria-live="polite">{notice}</div>}
 {tab==="overview"&&<><div className="stats"><article><small>Productos publicados</small><strong>{initialProducts.filter(p=>p.active).length}</strong></article><article><small>Catálogo para consulta</small><strong>{initialProducts.filter(p=>p.catalog_visible).length}</strong></article><article><small>Borradores</small><strong>{initialProducts.filter(p=>!p.active&&!p.catalog_visible).length}</strong></article><article><small>Solicitudes WhatsApp</small><strong>{initialWhatsAppRequests.length}</strong></article><article><small>Stock bajo (≤5)</small><strong>{initialProducts.filter(p=>p.active&&p.stock<=5).length}</strong></article></div><section className="panel"><h2>¿Qué necesitás hacer hoy?</h2><p>Empezá por Productos: podés cargar fotos, completar datos y guardar borradores sin que aparezcan en la tienda. Cuando estén revisados, vas a poder publicarlos.</p><div className="admin-quick-actions"><button className="btn primary" onClick={()=>changeTab("products")}>Administrar productos</button><button className="btn ghost" onClick={()=>changeTab("requests")}>Ver pedidos de WhatsApp</button><button className="btn ghost" onClick={()=>changeTab("zones")}>Configurar entregas</button></div></section></>}
 {tab==="products"&&<div className="admin-2col"><div className="panel"><h2>{draft.id?"Editar producto":"Agregar producto"}</h2>
 <p className="admin-editor-guide">Completá nombre, precio y foto. Guardá el borrador para seguir después o publicá cuando tengas los datos confirmados.</p>
 {productHasChanges&&<p className="admin-unsaved" role="status">Tenés cambios sin guardar en esta ficha.</p>}
 <div className="admin-catalog-import">
  <div><strong>Cargar desde el catálogo</strong><p>Seleccioná un producto existente para completar nombre, precio, código, descripción y foto. Después, confirmá el stock.</p></div>
  <button type="button" className="btn primary admin-catalog-cta" aria-expanded={showCatalogPicker} aria-controls="admin-catalog-picker" onClick={()=>setShowCatalogPicker(value=>!value)}>{showCatalogPicker?"Cerrar catálogo":"Cargar desde catálogo"}</button>
 </div>
 {showCatalogPicker&&<section id="admin-catalog-picker" aria-label="Productos del catálogo" className="admin-catalog-picker">
  <div className="admin-product-filters">
   <label>Buscar producto o SKU<input type="search" value={catalogQuery} onChange={e=>setCatalogQuery(e.target.value)} placeholder="Nombre, sabor o código"/></label>
   <label>Tipo de producto<select value={catalogType} onChange={e=>setCatalogType(e.target.value)}><option value="all">Todos los tipos</option>{catalogTypes.map(type=><option key={type} value={type}>{type}</option>)}</select></label>
  </div>
  <p className="hint">{catalogMatches.length} opciones del catálogo. Las que ya existen en el panel no se duplican.</p>
  <div className="admin-catalog-options">{catalogMatches.map(item=>{
   const used=savedSkus.has(item.sku.toLowerCase());
   return <button type="button" key={item.sourceRow} disabled={busy||used} aria-label={used?`${item.name} ya cargado`:`Cargar ${item.name}`} onClick={()=>{
     startProduct(draftFromPricedCatalog(item,initialCategories));
     setShowCatalogPicker(false);
   }}>
    <span className="admin-catalog-item-photo">{item.image?<Image src={item.image} alt="" fill sizes="66px"/>:"Sin foto"}</span>
    <span><strong>{item.name}</strong><small>{item.presentation} · {ars(item.price)}</small><small>{item.category}</small></span>
    <b>{used?"Ya cargado":"Elegir"}</b>
   </button>;
  })}</div>
  {!catalogMatches.length?<p className="hint">No se encontraron productos con ese filtro.</p>:null}
 </section>}
 <details className="admin-source-images"><summary>Usar otra fotografía del catálogo</summary>
  <p className="hint">Elegí una foto disponible; se guardará como borrador hasta que revises sus datos.</p>
  <button className="btn ghost" type="button" aria-expanded={showCandidatePicker} aria-controls="candidate-catalog-picker" onClick={()=>setShowCandidatePicker(value=>!value)}>{showCandidatePicker?"Cerrar imágenes":"Elegir foto"}</button>
 </details>
 {showCandidatePicker&&<section id="candidate-catalog-picker" className="admin-candidate-picker" aria-label="Imágenes candidatas">
 <label>Buscar imagen o categoría<input type="search" value={candidateQuery} onChange={e=>setCandidateQuery(e.target.value)} placeholder="Buscar entre las 45 fichas"/></label>
 <p className="hint">{candidateResults.length} coincidencias; las imágenes ya asociadas a un producto se muestran como cargadas.</p>
 <div className="admin-candidate-grid">{candidateResults.map(asset=>{
  const used=usedCandidateImages.has(asset.image);
  return <button type="button" className="admin-candidate-card" disabled={busy||used} key={asset.id} onClick={()=>chooseCandidate(asset)} aria-label={used?`${asset.name} ya cargado`:`Usar imagen de ${asset.name}`}>
   <span className="admin-candidate-art"><Image src={asset.image} alt="" fill sizes="110px"/></span>
   <span className="admin-candidate-name">{asset.name}</span><small>{asset.category}</small>
   <strong>{used?"Ya cargado":"Usar en borrador"}</strong>
  </button>;
 })}</div>
 {candidateResults.length===0&&<p>No hay imágenes con esa búsqueda.</p>}
 </section>}
 <form onSubmit={(e:FormEvent)=>{e.preventDefault();void saveProduct("save");}}>
 <label>Nombre del producto<input required maxLength={160} value={draft.name} onChange={e=>{updateDraft("name",e.target.value);if(!draft.id)updateDraft("slug",slugify(e.target.value));}}/></label>
 <div className="form-inline">
  <label>Precio de venta (ARS)<input required type="number" min="0" max="1000000000" step="0.01" value={draft.price} onChange={e=>updateDraft("price",Number(e.target.value))}/></label>
  <label>Stock disponible<input aria-label="Unidades disponibles" required type="number" min="0" max="10000000" step="1" value={draft.stock} onChange={e=>updateDraft("stock",Number(e.target.value))}/><small>Si todavía no lo verificaste, dejalo en 0.</small></label>
 </div>
 <label>Categoría<select value={draft.category_id||""} onChange={e=>updateDraft("category_id",e.target.value||null)}><option value="">Sin categoría</option>{initialCategories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 {draft.name&&!draft.category_id?<p className="hint">Si este tipo todavía no figura como categoría del panel, podés crearla en «Categorías» antes de publicar.</p>:null}
 <details className="admin-advanced admin-product-extra">
  <summary>Más detalles del producto: descripción, SKU y presentación</summary>
  <label>Descripción para el cliente<textarea rows={4} value={draft.description} onChange={e=>updateDraft("description",e.target.value)} placeholder="Ej.: presentación, sabores y características del producto"/><small>Se muestra en la tienda. Para publicar, se necesitan al menos 20 caracteres.</small></label>
  <div className="form-inline"><label>Código del producto (SKU)<input value={draft.sku||""} onChange={e=>updateDraft("sku",e.target.value)}/></label><label>Presentación (ej.: 5 litros)<input value={draft.presentation||""} onChange={e=>updateDraft("presentation",e.target.value)}/></label></div>
  <label>Dirección del producto<input required value={draft.slug} onChange={e=>updateDraft("slug",e.target.value)}/><small>Se completa automáticamente al ingresar un nombre.</small></label>
 </details>
 <div className="admin-draft-preview" aria-label="Resumen de la ficha"><div className="admin-draft-art">{draft.image_url?<Image src={draft.image_url} alt="" fill sizes="120px" unoptimized/>:"Sin imagen"}</div><div><small>ESTADO · {draft.active?"PUBLICACIÓN VERIFICADA":draft.catalog_visible?"VISIBLE PARA CONSULTA · STOCK PENDIENTE":"OCULTO DE LA TIENDA"}</small><strong>{draft.name||"Nuevo producto"}</strong><span>{draft.price>0?ars(draft.price):"Precio a confirmar"} · {draft.stock>0?`Stock: ${draft.stock}`:"Stock sin confirmar"}</span></div></div><div className="admin-photo-upload"><p><strong>Foto del producto</strong><small>Subí una foto JPG, PNG o WEBP de hasta 3 MB.</small></p>{uploader("product")}<details className="admin-advanced"><summary>¿Tenés un enlace a la foto?</summary><label>URL de imagen<input value={draft.image_url||""} onChange={e=>updateDraft("image_url",e.target.value)} placeholder="https://... o /catalogo/..."/></label></details></div>
 <div className="admin-product-publish" aria-label="Publicación del producto">
  <strong>Estado actual: {draft.active?"Publicado en la tienda":draft.catalog_visible?"Visible en el catálogo":"Borrador oculto"}</strong>
  <p>{draft.active?"Al guardar, los cambios se actualizarán en la tienda.":draft.catalog_visible?"Al guardar, esta presentación importada se mostrará en el catálogo; confirmaremos stock al recibir el pedido.":"Podés guardar ahora y completar los datos antes de publicar."}</p>
  <label className="inline-check"><input type="checkbox" checked={Boolean(draft.commercially_verified)} onChange={e=>updateDraft("commercially_verified",e.target.checked)}/> Confirmé precio, descripción y disponibilidad</label>
  <details className="admin-advanced admin-product-extra"><summary>Opciones adicionales de visibilidad</summary>
   <label className="inline-check"><input type="checkbox" checked={Boolean(draft.featured)} onChange={e=>updateDraft("featured",e.target.checked)}/> Destacar en la portada</label>
   <label className="inline-check"><input type="checkbox" checked={Boolean(draft.catalog_visible)} disabled={!/^excel-fila-[1-9][0-9]*$/.test(draft.slug)||draft.active} onChange={e=>updateDraft("catalog_visible",e.target.checked)}/> Mostrar presentación importada en el catálogo aunque el stock esté por confirmar</label>
  </details>
  {publicationIssues.length>0&&!draft.active?<p className="admin-readiness" role="status">Para publicar falta: {publicationIssues.join(", ")}.</p>:null}
 </div>
 <div className="admin-product-actions">
  <button type="submit" disabled={busy||(draft.active&&publicationIssues.length>0)} className="btn primary">{draft.id?"Guardar cambios":draft.catalog_visible?"Guardar y mostrar en catálogo":"Guardar borrador"}</button>
  {!draft.active?<button type="button" className="btn ghost" disabled={busy||publicationIssues.length>0} onClick={()=>void saveProduct("publish")}>Publicar en la tienda</button>:null}
  <button type="button" className="btn ghost" disabled={busy} onClick={()=>startProduct({...empty})}>{draft.id?"Dejar de editar":"Limpiar formulario"}</button>
 </div></form></div>
 <div className="panel"><div className="admin-list-heading"><h2>Productos cargados</h2><button type="button" className="btn ghost" disabled={busy} onClick={()=>startProduct({...empty})}>+ Nuevo producto</button></div><p className="admin-list-guide">Oculto = no aparece en la tienda. Visible para consulta = se puede agregar al carrito, sin stock garantizado. Publicado = verificado.</p><div className="admin-product-filters"><label>Buscar producto o SKU<input aria-label="Buscar producto o SKU" type="search" value={productQuery} onChange={e=>setProductQuery(e.target.value)} placeholder="Nombre, SKU o URL"/></label><label>Estado<select aria-label="Filtrar productos por estado" value={productStatus} onChange={e=>setProductStatus(e.target.value as typeof productStatus)}><option value="all">Todos</option><option value="published">Publicados</option><option value="hidden">Borradores</option><option value="pending">Pendientes de revisar</option></select></label></div><p className="admin-count" aria-live="polite">{filteredProducts.length} de {initialProducts.length} productos</p><div className="admin-list">{filteredProducts.map(p=><article key={p.id} className="admin-list-row"><div className="mini-art">{p.image_url?<Image src={p.image_url} alt={p.name} fill sizes="56px" unoptimized/>:"📦"}</div><div className="grow"><strong>{p.name}</strong><small>{p.price>0?ars(Number(p.price)):"Precio pendiente"} · {p.stock} unidades</small><span className={`admin-item-state ${p.active?"live":"draft"}`}>{p.active?"Publicado":p.catalog_visible?"Visible para consulta":p.commercially_verified?"Borrador":"Pendiente de revisar"}</span></div><button className="btn tiny" onClick={()=>startProduct({...p,price:Number(p.price),stock:Number(p.stock)})}>Editar</button>{(p.active||p.catalog_visible)&&<button className="btn tiny danger" disabled={busy} onClick={()=>void hideProduct(p)}>Ocultar</button>}</article>)}{!initialProducts.length?<p>Agregá tu primer producto.</p>:!filteredProducts.length?<p>No se encontraron productos con esos filtros. <button className="admin-reset-filter" type="button" onClick={()=>{setProductQuery("");setProductStatus("all");}}>Limpiar filtros</button></p>:null}</div></div></div>}
 {tab==="categories"&&<div className="panel narrow"><h2>Categorías</h2><p className="hint">Organizá los productos por grupo. Para eliminar una categoría, primero mové sus productos a otra.</p><form onSubmit={e=>{e.preventDefault();void act(async()=>{await request("categories",newCat.id?"PATCH":"POST",newCat);setNewCat({id:"",name:"",slug:""});});}}><label>Nombre<input required value={newCat.name} onChange={e=>setNewCat(v=>({...v,name:e.target.value,slug:v.id?v.slug:slugify(e.target.value)}))}/></label><details className="admin-advanced"><summary>Editar la dirección de la categoría (opcional)</summary><label>Dirección de la categoría<input required value={newCat.slug} onChange={e=>setNewCat(v=>({...v,slug:e.target.value}))}/><small>Se genera sola. Si la categoría ya existe, se conserva su enlace para no romper vínculos.</small></label></details><button disabled={busy} className="btn primary">{newCat.id?"Guardar categoría":"Crear categoría"}</button>{newCat.id&&<button type="button" className="btn ghost" onClick={()=>setNewCat({id:"",name:"",slug:""})}>Cancelar edición</button>}</form><div className="admin-list">{initialCategories.map(c=><div className="admin-list-row" key={c.id}><strong className="grow">{c.name} <small className="hint">({initialProducts.filter(p=>p.category_id===c.id).length} productos)</small></strong><button className="btn tiny" onClick={()=>setNewCat({id:c.id,name:c.name,slug:c.slug})}>Editar</button><button className="btn tiny danger" disabled={busy||initialProducts.some(p=>p.category_id===c.id)} title={initialProducts.some(p=>p.category_id===c.id)?"Mové sus productos antes de eliminarla":undefined} onClick={()=>{if(confirm("¿Eliminar esta categoría?"))void act(()=>request("categories","DELETE",{id:c.id}));}}>Eliminar</button></div>)}</div></div>}
 {tab==="zones"&&<div className="panel narrow"><h2>Configurar zona de entrega</h2><p className="hint">Elegí dónde repartís y confirmá la tarifa antes de activarla.</p><form onSubmit={e=>{e.preventDefault();void act(()=>request("zones",zoneId?"PATCH":"POST",{...(zoneId?{id:zoneId}:{}),name:zoneName,postal_codes:zoneCodes.split(",").map(x=>x.trim().toUpperCase()).filter(Boolean),cost:zoneCost===""?null:Number(zoneCost),free_shipping_eligible:zoneFree,ready:zoneReady,active:zoneReady}));}}><label>Zona o barrio<input required value={zoneName} onChange={e=>setZoneName(e.target.value)} placeholder="Ej.: Lomas de Zamora"/></label><label>Códigos postales separados por comas<input value={zoneCodes} onChange={e=>setZoneCodes(e.target.value)} placeholder="1832, B1832"/></label><label>Tarifa bajo el umbral (ARS)<input required={zoneReady} min="0" type="number" value={zoneCost} onChange={e=>setZoneCost(e.target.value)}/></label><label className="inline-check"><input type="checkbox" checked={zoneFree} onChange={e=>setZoneFree(e.target.checked)}/> Elegible para envío gratis desde el umbral</label><label className="inline-check"><input type="checkbox" checked={zoneReady} onChange={e=>setZoneReady(e.target.checked)}/> Tarifa y cobertura verificadas; activar zona</label><p className="hint">Una tarifa vacía significa pendiente. El valor 0 sólo debe usarse si la entrega es realmente gratuita por debajo del umbral.</p><button className="btn primary" disabled={busy}>{zoneId?"Guardar zona":"Agregar zona"}</button>{zoneId&&<button type="button" className="btn ghost" onClick={()=>{setZoneId("");setZoneName("");setZoneCodes("");setZoneCost("");setZoneReady(false);setZoneFree(false)}}>Cancelar edición</button>}</form><h3>Zonas configuradas</h3><div className="admin-list">{initialZones.map(z=><div key={z.id} className="admin-list-row"><div className="grow"><strong>{z.name}</strong><small>{z.cost===null?"Tarifa pendiente":ars(Number(z.cost))} · {z.free_shipping_eligible?"Elegible para gratis":"Sin envío gratis"} · {z.active?"Activa":"Inactiva"}</small></div><button className="btn tiny" onClick={()=>{setZoneId(z.id);setZoneName(z.name);setZoneCodes(z.postal_codes.join(", "));setZoneCost(z.cost===null?"":String(z.cost));setZoneReady(Boolean(z.ready));setZoneFree(Boolean(z.free_shipping_eligible))}}>Editar</button><button className="btn tiny danger" onClick={()=>{if(confirm(`¿Desactivar la zona ${z.name}? Dejará de aparecer como opción de envío.`))void act(()=>request("zones","DELETE",{id:z.id}));}}>Desactivar</button></div>)}</div></div>}
 {tab==="banners"&&<div className="panel narrow"><h2>Banner promocional</h2><form onSubmit={e=>{e.preventDefault();void act(async()=>{await request("banners",banner.id?"PATCH":"POST",banner);setBanner({id:"",title:"",subtitle:"",image_url:"",href:"/catalogo",active:true,sort_order:0});});}}><label>Título<input required value={banner.title} onChange={e=>setBanner(v=>({...v,title:e.target.value}))}/></label><label>Texto<input value={banner.subtitle} onChange={e=>setBanner(v=>({...v,subtitle:e.target.value}))}/></label><label>Enlace<input value={banner.href} onChange={e=>setBanner(v=>({...v,href:e.target.value}))}/></label><label>URL de imagen<input value={banner.image_url} onChange={e=>setBanner(v=>({...v,image_url:e.target.value}))}/></label>{uploader("banner")}{banner.image_url&&<Image className="upload-preview" src={banner.image_url} width={180} height={130} unoptimized alt="Banner"/>}<button className="btn primary" disabled={busy}>{banner.id?"Guardar banner":"Crear banner"}</button>{banner.id&&<button type="button" className="btn ghost" onClick={()=>setBanner({id:"",title:"",subtitle:"",image_url:"",href:"/catalogo",active:true,sort_order:0})}>Cancelar edición</button>}</form><div className="admin-list">{initialBanners.map(b=><div key={b.id} className="admin-list-row"><div className="grow"><strong>{b.title}</strong><small>{b.subtitle}</small></div><button className="btn tiny" onClick={()=>setBanner({...b,image_url:b.image_url||""})}>Editar</button><button className="btn tiny danger" onClick={()=>{if(confirm("¿Eliminar este banner?"))void act(()=>request("banners","DELETE",{id:b.id}));}}>Eliminar</button></div>)}</div></div>}
 {tab==="settings"&&<div className="panel wide"><h2>Información de la tienda</h2><p>Acá cambiás los datos que ven los clientes. El botón Guardar aplica todo junto o no cambia nada si ocurre un error.</p>{settingsHaveChanges&&<p className="admin-unsaved" role="status">Hay cambios en la configuración que todavía no guardaste.</p>}<form onSubmit={e=>{e.preventDefault();const value=Object.fromEntries(Object.entries(settings).filter(([key])=>key!=="id"));void act(async()=>{await request("settings","PUT",value);setSavedSettings({...settings});});}}><div className="settings-grid">
 {([['name','Nombre comercial'],['description','Descripción de la distribuidora'],['address','Dirección'],['phone','Teléfono'],['contact_email','Email de contacto'],['instagram','URL de Instagram'],['maps_url','URL de Google Maps'],['hero_title','Título de portada'],['hero_subtitle','Subtítulo de portada'],['bank_alias','Alias para transferencias'],['bank_cbu','CBU/CVU para transferencias'],['bank_holder','Titular de la cuenta']] as const).map(([key,label])=><label key={key}>{label}<input value={settings[key]} onChange={e=>setSettings(s=>({...s,[key]:e.target.value}))}/></label>)}
 <label>WhatsApp — enlace wa.link o número internacional<input value={settings.whatsapp} onChange={e=>setSettings(s=>({...s,whatsapp:e.target.value}))} placeholder="https://wa.link/xxxxxx o +54911..."/><span className="hint">Pegá el enlace generado en wa.link o el número con +54 9. No uses el teléfono fijo si no está habilitado en WhatsApp.</span></label>
 <label>Monto mínimo para envío gratis (ARS)<input type="number" min="0" step="1" value={settings.free_shipping_threshold} onChange={e=>setSettings(s=>({...s,free_shipping_threshold:Number(e.target.value)}))}/></label>
 <label>Duración de reserva (minutos)<input type="number" min="10" max="1440" step="1" value={settings.reservation_minutes} onChange={e=>setSettings(s=>({...s,reservation_minutes:Number(e.target.value)}))}/></label>
 <label className="inline-check"><input type="checkbox" checked={settings.transfer_enabled} onChange={e=>setSettings(s=>({...s,transfer_enabled:e.target.checked}))}/> Habilitar transferencia (requiere datos bancarios completos)</label>
 <label className="inline-check"><input type="checkbox" checked={settings.on_delivery_enabled} onChange={e=>setSettings(s=>({...s,on_delivery_enabled:e.target.checked}))}/> Habilitar pago al recibir</label>
 <label className="inline-check"><input type="checkbox" checked={settings.pickup_enabled} onChange={e=>setSettings(s=>({...s,pickup_enabled:e.target.checked}))}/> Habilitar retiro en distribuidora</label>
 <label>URL del logo<input value={settings.logo_url||""} onChange={e=>setSettings(s=>({...s,logo_url:e.target.value}))}/>{uploader("logo")}{settings.logo_url&&<Image className="upload-preview" src={settings.logo_url} width={180} height={90} unoptimized alt="Vista previa del logo"/>}</label>
 <label>URL de la portada<input value={settings.hero_image_url||""} onChange={e=>setSettings(s=>({...s,hero_image_url:e.target.value}))}/>{uploader("hero")}{settings.hero_image_url&&<Image className="upload-preview" src={settings.hero_image_url} width={180} height={130} unoptimized alt="Vista previa de la portada"/>}</label>
 <label className="span-two">Política de cambios y devoluciones<textarea rows={7} value={settings.returns_policy} onChange={e=>setSettings(s=>({...s,returns_policy:e.target.value}))}/></label><label className="span-two">Política de privacidad<textarea rows={7} value={settings.privacy_policy} onChange={e=>setSettings(s=>({...s,privacy_policy:e.target.value}))}/></label>
 </div><p className="hint">Estos textos son contenido editable, no políticas legales generadas automáticamente. Revisalas antes de publicar.</p><button className="btn primary" disabled={busy}>Guardar configuración</button></form></div>}
 {tab==="requests"&&<WhatsAppRequests requests={initialWhatsAppRequests} freeShippingThreshold={Number(initialSettings.free_shipping_threshold)}/>}
 {tab==="orders"&&<div className="panel"><h2>Pedidos recibidos</h2><p>Avanzá cada pedido con los botones de estado. Solo marcá un pago como cobrado si comprobaste que lo recibiste.</p><div className="admin-list">{initialOrders.map(o=>{const next=nextOrderStep(o);return <article className="admin-list-row" key={o.id}><div className="grow"><strong>#{o.id.slice(0,8)} · {o.customer_name}</strong><small>{o.customer_email} · {o.customer_phone} · {new Date(o.created_at).toLocaleDateString("es-AR")}</small><small>{o.shipping_method==="pickup"?"Retiro":"Envío: "+o.address}</small><small>Pago: {o.payment_method==="transfer"?"Transferencia":"Al recibir"} · {o.payment_status==="paid"?"Cobrado":"Pendiente"}</small></div><div className="grow">{o.order_items?.map((it,i)=><small key={i}>{it.quantity} × {it.product_name} · {ars(Number(it.unit_price))}</small>)}</div><strong>{ars(Number(o.total))}</strong><span className="status-pill">{orderStatusLabel(o.status)}</span>{o.payment_status!=="paid"&&!(["cancelled","expired"] as string[]).includes(o.status)&&<button className="btn tiny" disabled={busy} onClick={()=>{if(confirm("¿Verificaste que el pago se recibió realmente?"))void act(()=>request("orders","PATCH",{id:o.id,action:"mark_paid"}));}}>Marcar cobrado</button>}{next&&<button className="btn tiny" disabled={busy} onClick={()=>{if(next.status==="delivered"&&!confirm("¿Confirmás que el cliente recibió el pedido?"))return;void act(()=>request("orders","PATCH",{id:o.id,action:"set_status",status:next.status}),true,"Estado del pedido actualizado");}}>{next.label}</button>}{o.payment_status!=="paid"&&!(["delivered","cancelled","expired"] as string[]).includes(o.status)&&<button className="btn tiny danger" disabled={busy} onClick={()=>{if(confirm("¿Cancelar pedido y devolver el stock?"))void act(()=>request("orders","PATCH",{id:o.id,action:"cancel"}));}}>Cancelar</button>}</article>;})}{!initialOrders.length&&<p>No hay pedidos todavía. Los pedidos nuevos aparecerán acá cuando se habiliten las ventas.</p>}</div></div>}

 </main>
 <nav className="admin-mobile-bottom-nav" aria-label="Accesos rápidos de administración">
  {mobileMainTabs.map(id=>{
   const item=nav.find(n=>n.id===id)!;
   return <button key={id} type="button" aria-label={`Acceso rápido: ${item.label}`} aria-pressed={tab===id}
    disabled={busy} onClick={()=>changeTab(id)} className={tab===id?"active":""}>
    <item.icon size={20} aria-hidden="true"/><span>{id==="overview"?"Inicio":item.label}</span>
   </button>;
  })}
  <button type="button" className={mobileMoreOpen||mobileMoreTabs.includes(tab)?"active":""}
   aria-label="Más módulos administrativos" aria-expanded={mobileMoreOpen} aria-controls="admin-mobile-more"
   onClick={()=>setMobileMoreOpen(value=>!value)} disabled={busy}>
   <Menu size={20} aria-hidden="true"/><span>Más</span>
  </button>
 </nav>
 <div id="admin-mobile-more" className={`admin-mobile-more ${mobileMoreOpen?"is-open":""}`} aria-hidden={!mobileMoreOpen}>
  <div className="admin-mobile-more-header"><strong>Más herramientas</strong><button type="button" aria-label="Cerrar más módulos" onClick={()=>setMobileMoreOpen(false)} tabIndex={mobileMoreOpen?0:-1}><X size={20} aria-hidden="true"/></button></div>
  {mobileMoreTabs.map(id=>{const item=nav.find(n=>n.id===id)!;return <button type="button" key={id} className={tab===id?"active":""}
   disabled={busy} aria-label={`Ir a ${item.label}`} aria-pressed={tab===id}
   onClick={()=>changeTab(id)} tabIndex={mobileMoreOpen?0:-1}>
   <item.icon size={19} aria-hidden="true"/>{item.label}</button>;})}
 </div></div>;
}
