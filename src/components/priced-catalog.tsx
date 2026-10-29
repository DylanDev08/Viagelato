"use client";

import Image from "next/image";
import Link from "next/link";
import {ArrowUpRight,ImageOff,Search,SlidersHorizontal} from "lucide-react";
import {useDeferredValue,useMemo,useState} from "react";
import {ars} from "@/lib/types";
import {normalizeCatalogText} from "@/lib/catalog-search";
import {PricedAddToCart} from "./priced-add-to-cart";
import type {CatalogPriceItem} from "@/lib/catalog-prices";

export function PricedCatalog({items}:{items:CatalogPriceItem[]}){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const [sort,setSort]=useState("category");
 const deferredQuery=useDeferredValue(normalizeCatalogText(query));
 const categories=useMemo(()=>[...new Set(items.map(item=>item.category))].sort((a,b)=>a.localeCompare(b,"es")),[items]);
 const filtered=useMemo(()=>items.filter(item=>
  (category==="all"||item.category===category)&&
  normalizeCatalogText(`${item.name} ${item.category} ${item.presentation} ${item.variants}`).includes(deferredQuery)
 ).sort((a,b)=>sort==="price-asc"?a.price-b.price:sort==="price-desc"?b.price-a.price:sort==="name"?a.name.localeCompare(b.name,"es"):a.category.localeCompare(b.category,"es")||a.name.localeCompare(b.name,"es")),[items,category,deferredQuery,sort]);
 return <div className="priced-catalog">
  <div className="provisional-controls">
   <div className="provisional-toolbar">
    <label className="catalog-search"><Search aria-hidden="true"/><span className="sr-only">Buscar productos</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar productos o sabores"/></label>
    <label className="catalog-sort"><SlidersHorizontal aria-hidden="true"/><span className="sr-only">Ordenar</span><select value={sort} onChange={e=>setSort(e.target.value)}>
     <option value="category">Por categoría</option><option value="name">Por nombre</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option>
    </select></label>
   </div>
   <div className="category-tabs" role="group" aria-label="Filtrar productos por categoría">
    <button type="button" aria-pressed={category==="all"} className={category==="all"?"active":""} onClick={()=>setCategory("all")}>Todos</button>
    {categories.map(item=><button type="button" aria-pressed={category===item} className={category===item?"active":""} onClick={()=>setCategory(item)} key={item}>{item}</button>)}
   </div>
  </div>
  <p className="provisional-count" aria-live="polite">{filtered.length} {filtered.length===1?"producto":"productos"} con precio por presentación</p>
  <div className="provisional-grid priced-grid">
   {filtered.map(item=><article className="provisional-card priced-card" key={item.sourceRow}>
    <Link className="provisional-card-link" href={`/catalogo/vista/${item.id}`} aria-label={`Ver ficha y precio de ${item.name}`}>
     <div className="provisional-image priced-image">
      {item.image?<Image src={item.image} alt={item.name} fill sizes="(max-width:640px) 100vw,(max-width:1000px) 50vw,25vw"/>:<div className="priced-image-pending"><ImageOff size={34} aria-hidden="true"/><span>Foto pendiente</span></div>}
      <ArrowUpRight className="provisional-open-icon" aria-hidden="true"/>
     </div>
     <div className="provisional-card-body priced-card-body">
      <p>{item.category}</p><h2>{item.name}</h2>
      <span className="priced-presentation">{item.presentation}</span>
      <span className="priced-description">{item.description}</span>
      <div className="priced-card-bottom"><div><small>PRECIO FINAL POR PRESENTACIÓN</small><strong>{ars(item.price)}</strong></div><ArrowUpRight aria-hidden="true"/></div>
      {item.imageStatus==="referencial"&&<span className="priced-image-note">Fotografía general de referencia</span>}
      {item.imageStatus==="sin_foto"&&<span className="priced-image-note">Fotografía pendiente</span>}
     </div>
    </Link>
    <PricedAddToCart item={item}/>
   </article>)}
  </div>
  {filtered.length===0&&<div className="empty-catalog"><h3>No encontramos productos.</h3><button type="button" onClick={()=>{setQuery("");setCategory("all");setSort("category");}}>Limpiar filtros</button></div>}
 </div>;
}
