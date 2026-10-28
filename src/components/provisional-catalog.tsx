"use client";

import Image from "next/image";
import {Search,SlidersHorizontal} from "lucide-react";
import {useDeferredValue,useMemo,useState} from "react";
import {PROVISIONAL_CATEGORIES,type ProvisionalAsset} from "@/lib/provisional-catalog";

export function ProvisionalCatalog({assets}:{assets:ProvisionalAsset[]}){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const [sort,setSort]=useState("category");
 const deferredQuery=useDeferredValue(query.toLocaleLowerCase("es"));
 const visible=useMemo(()=>assets.filter(asset=>(category==="all"||asset.category===category)&&`${asset.name} ${asset.category}`.toLocaleLowerCase("es").includes(deferredQuery)).toSorted((a,b)=>sort==="name"?a.name.localeCompare(b.name,"es"):a.category.localeCompare(b.category,"es")||a.name.localeCompare(b.name,"es")),[assets,category,deferredQuery,sort]);
 return <>
  <div className="provisional-controls"><div className="provisional-toolbar"><label className="catalog-search"><Search/><span className="sr-only">Buscar productos</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar productos"/></label><label className="catalog-sort"><SlidersHorizontal/><span className="sr-only">Ordenar</span><select value={sort} onChange={event=>setSort(event.target.value)}><option value="category">Por categoría</option><option value="name">Por nombre</option></select></label></div><div className="category-tabs" role="group" aria-label="Filtrar productos por categoría"><button type="button" aria-pressed={category==="all"} className={category==="all"?"active":""} onClick={()=>setCategory("all")}>Todos</button>{PROVISIONAL_CATEGORIES.map(item=><button type="button" aria-pressed={category===item} className={category===item?"active":""} key={item} onClick={()=>setCategory(item)}>{item}</button>)}</div></div>
  <p className="provisional-count" aria-live="polite">{visible.length} {visible.length===1?"resultado":"resultados"}</p>
  <div className="provisional-grid">{visible.map(asset=><article className="provisional-card" key={asset.id}><div className="provisional-image"><Image src={asset.image} alt={asset.name} fill sizes="(max-width: 640px) 100vw, (max-width: 1000px) 50vw, 25vw"/></div><div><p>{asset.category}</p><h2>{asset.name}</h2><span>Información comercial pendiente</span></div></article>)}</div>
  {!visible.length&&<div className="empty-catalog"><h3>No hay coincidencias.</h3><button onClick={()=>{setQuery("");setCategory("all")}}>Limpiar filtros</button></div>}
 </>;
}
