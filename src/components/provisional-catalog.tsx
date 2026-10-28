"use client";

import Image from "next/image";
import Link from "next/link";
import {ArrowUpRight} from "lucide-react";
import {Search,SlidersHorizontal} from "lucide-react";
import {useDeferredValue,useMemo,useState} from "react";
import type {ProvisionalAsset} from "@/lib/provisional-catalog";
import {normalizeCatalogText} from "@/lib/catalog-search";

export function ProvisionalCatalog({assets}:{assets:ProvisionalAsset[]}){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const [sort,setSort]=useState("category");
 const deferredQuery=useDeferredValue(normalizeCatalogText(query));
 const availableCategories=useMemo(()=>[...new Set(assets.map(asset=>asset.category))].sort((a,b)=>a.localeCompare(b,"es")),[assets]);
 const visible=useMemo(()=>assets.filter(asset=>(category==="all"||asset.category===category)&&normalizeCatalogText(`${asset.name} ${asset.category}`).includes(deferredQuery)).toSorted((a,b)=>sort==="name"?a.name.localeCompare(b.name,"es"):a.category.localeCompare(b.category,"es")||a.name.localeCompare(b.name,"es")),[assets,category,deferredQuery,sort]);
 return <>
  <div className="provisional-controls"><div className="provisional-toolbar"><label className="catalog-search"><Search/><span className="sr-only">Buscar productos</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar productos"/></label><label className="catalog-sort"><SlidersHorizontal/><span className="sr-only">Ordenar</span><select value={sort} onChange={event=>setSort(event.target.value)}><option value="category">Por categoría</option><option value="name">Por nombre</option></select></label></div><div className="category-tabs" role="group" aria-label="Filtrar productos por categoría"><button type="button" aria-pressed={category==="all"} className={category==="all"?"active":""} onClick={()=>setCategory("all")}>Todos</button>{availableCategories.map(item=><button type="button" aria-pressed={category===item} className={category===item?"active":""} key={item} onClick={()=>setCategory(item)}>{item}</button>)}</div></div>
  <p className="provisional-count" aria-live="polite">{visible.length} {visible.length===1?"resultado":"resultados"}</p>
  <div className="provisional-grid">{visible.map(asset=><article className="provisional-card" key={asset.id}><Link className="provisional-card-link" href={`/catalogo/vista/${asset.id}`} aria-label={`Ver ficha de ${asset.name}`}><div className="provisional-image"><Image src={asset.image} alt={asset.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 25vw"/><ArrowUpRight className="provisional-open-icon" aria-hidden="true"/></div><div className="provisional-card-body"><p>{asset.category}</p><h2>{asset.name}</h2><span>Información comercial pendiente</span><strong className="provisional-view">Ver ficha y consultar <ArrowUpRight size={15}/></strong></div></Link></article>)}</div>
  {!visible.length&&<div className="empty-catalog"><h3>No hay coincidencias.</h3><button type="button" onClick={()=>{setQuery("");setCategory("all");setSort("category");}}>Limpiar filtros</button></div>}
 </>;
}
