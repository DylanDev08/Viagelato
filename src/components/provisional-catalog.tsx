"use client";

import Image from "next/image";
import {Search} from "lucide-react";
import {useDeferredValue,useState} from "react";
import {PROVISIONAL_CATEGORIES,type ProvisionalAsset} from "@/lib/provisional-catalog";

export function ProvisionalCatalog({assets}:{assets:ProvisionalAsset[]}){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const deferredQuery=useDeferredValue(query.toLocaleLowerCase("es"));
 const visible=assets.filter(asset=>(category==="all"||asset.category===category)&&`${asset.name} ${asset.category}`.toLocaleLowerCase("es").includes(deferredQuery));
 return <>
  <div className="provisional-controls"><label className="catalog-search"><Search/><span className="sr-only">Buscar material</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar por nombre provisional"/></label><div className="category-tabs" role="group" aria-label="Filtrar material por categoría"><button className={category==="all"?"active":""} onClick={()=>setCategory("all")}>Todo ({assets.length})</button>{PROVISIONAL_CATEGORIES.map(item=><button className={category===item?"active":""} key={item} onClick={()=>setCategory(item)}>{item}</button>)}</div></div>
  <p className="provisional-count">Mostrando {visible.length} de {assets.length} imágenes integradas</p>
  <div className="provisional-grid">{visible.map(asset=><article className="provisional-card" key={asset.id}><div className="provisional-image"><Image src={asset.image} alt={asset.name} fill sizes="(max-width: 640px) 50vw, (max-width: 1000px) 33vw, 25vw"/>{asset.role==="material_marca"?<span className="asset-badge brand-material">MATERIAL DE MARCA</span>:<span className="asset-badge">EN REVISIÓN</span>}</div><div><p>{asset.category}</p><h2>{asset.name}</h2><span>Sin precio ni stock publicados</span></div></article>)}</div>
  {!visible.length&&<div className="empty-catalog"><h3>No hay coincidencias.</h3><button onClick={()=>{setQuery("");setCategory("all")}}>Limpiar filtros</button></div>}
 </>;
}
