"use client";

import Image from "next/image";
import Link from "next/link";
import {ArrowUpRight,ImageOff,Search,SlidersHorizontal} from "lucide-react";
import {useDeferredValue,useMemo,useState} from "react";
import {ars} from "@/lib/types";
import {normalizeCatalogText} from "@/lib/catalog-search";
import {groupCatalogByType} from "@/lib/catalog-groups";
import {PricedAddToCart} from "./priced-add-to-cart";
import type {CatalogPriceItem} from "@/lib/catalog-prices";

function CatalogProductCard({item}:{item:CatalogPriceItem}){
 return <article className="provisional-card priced-card" key={item.sourceRow}>
  <Link className="provisional-card-link" href={`/catalogo/vista/${item.id}`} aria-label={`Ver ficha y precio de ${item.name}`}>
   <div className="provisional-image priced-image">
    {item.image?<Image src={item.image} alt={item.name} fill sizes="(max-width:640px) 100vw,(max-width:1000px) 50vw,25vw" unoptimized/>:<div className="priced-image-pending"><ImageOff size={34} aria-hidden="true"/><span>Imagen no disponible</span></div>}
    <ArrowUpRight className="provisional-open-icon" aria-hidden="true"/>
   </div>
   <div className="provisional-card-body priced-card-body">
    <p>{item.category}</p><h3>{item.name}</h3>
    <span className="priced-presentation">{item.presentation}</span>
    <div className="priced-card-bottom"><div><small>PRECIO POR PRESENTACIÓN</small><strong>{ars(item.price)}</strong></div><ArrowUpRight aria-hidden="true"/></div>
    <span className="priced-view-detail">Ver detalles del producto <ArrowUpRight size={13} aria-hidden="true"/></span>
    {item.imageStatus==="referencial"&&<span className="priced-image-note">Fotografía general de referencia</span>}
    {item.imageStatus==="sin_foto"&&<span className="priced-image-note">Imagen no disponible</span>}
   </div>
  </Link>
  <PricedAddToCart item={item}/>
 </article>;
}

export function PricedCatalog({items,initialCategory,compact=false}:{items:CatalogPriceItem[];initialCategory?:string;compact?:boolean}){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState(()=>initialCategory&&items.some(item=>item.category===initialCategory)?initialCategory:"all");
 const [sort,setSort]=useState("category");
 const deferredQuery=useDeferredValue(normalizeCatalogText(query));
 const categories=useMemo(()=>groupCatalogByType(items).map(group=>group.name),[items]);
 const filtered=useMemo(()=>items.filter(item=>
  (category==="all"||item.category===category)&&
  normalizeCatalogText(`${item.name} ${item.category} ${item.presentation} ${item.variants}`).includes(deferredQuery)
 ).sort((a,b)=>sort==="price-asc"?a.price-b.price:sort==="price-desc"?b.price-a.price:sort==="name"?a.name.localeCompare(b.name,"es"):a.category.localeCompare(b.category,"es")||a.name.localeCompare(b.name,"es")),[items,category,deferredQuery,sort]);
 const groups=useMemo(()=>groupCatalogByType(filtered),[filtered]);
 return <div className={`priced-catalog ${compact?"compact-catalog":""}`}>
  {!compact?<div className="provisional-controls">
   <div className="provisional-toolbar">
    <label className="catalog-search"><Search aria-hidden="true"/><span className="sr-only">Buscar productos</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar productos o sabores"/></label>
    <label className="catalog-sort"><SlidersHorizontal aria-hidden="true"/><span className="sr-only">Ordenar</span><select value={sort} onChange={e=>setSort(e.target.value)}>
     <option value="category">Por categoría</option><option value="name">Por nombre</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option>
    </select></label>
   </div>
   <div className="category-tabs" role="group" aria-label="Filtrar productos por categoría">
    <button type="button" aria-pressed={category==="all"} className={category==="all"?"active":""} onClick={()=>setCategory("all")}>Todos los tipos</button>
    {categories.map(item=><button type="button" aria-pressed={category===item} className={category===item?"active":""} onClick={()=>setCategory(item)} key={item}>{item}</button>)}
   </div>
  </div>:null}
  {!compact?<p className="provisional-count" aria-live="polite">{filtered.length} {filtered.length===1?"producto":"productos"} con precio por presentación</p>:null}
  {compact?<div className="provisional-grid priced-grid" aria-label="Productos destacados">{filtered.map(item=><CatalogProductCard item={item} key={item.sourceRow}/>)}</div>:
   groups.map(group=><section className="catalog-type-section" key={group.name} aria-label={`Productos: ${group.name}`}>
    <div className="catalog-type-heading"><h2>{group.name}</h2><span>{group.count} {group.count===1?"producto":"productos"}</span></div>
    <div className="provisional-grid priced-grid">{group.items.map(item=><CatalogProductCard item={item} key={item.sourceRow}/>)}</div>
   </section>)}
  {!filtered.length&&!compact&&<div className="empty-catalog"><h3>No encontramos productos.</h3><button type="button" onClick={()=>{setQuery("");setCategory("all");setSort("category");}}>Limpiar filtros</button></div>}
 </div>;
}
