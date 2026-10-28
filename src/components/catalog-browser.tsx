"use client";

import {Search,SlidersHorizontal} from "lucide-react";
import {useMemo,useState} from "react";
import type {Category,Product} from "@/lib/types";
import {ProductCard} from "./product-card";

export function CatalogBrowser({products,categories}:{products:Product[];categories:Category[]}){
 const [query,setQuery]=useState("");
 const [category,setCategory]=useState("all");
 const [sort,setSort]=useState("featured");
 const filtered=useMemo(()=>products
  .filter(product=>(category==="all"||product.category_id===category)&&`${product.name} ${product.description} ${product.presentation??""}`.toLowerCase().includes(query.toLowerCase()))
  .sort((a,b)=>sort==="price-asc"?Number(a.price)-Number(b.price):sort==="price-desc"?Number(b.price)-Number(a.price):Number(Boolean(b.featured))-Number(Boolean(a.featured))),[products,category,query,sort]);
 return <div className="catalog-browser">
  <div className="catalog-toolbar">
   <label className="catalog-search"><Search/><span className="sr-only">Buscar</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Buscar en el catálogo"/></label>
   <label className="catalog-sort"><SlidersHorizontal/><span className="sr-only">Ordenar</span><select value={sort} onChange={event=>setSort(event.target.value)}><option value="featured">Destacados</option><option value="price-asc">Menor precio</option><option value="price-desc">Mayor precio</option></select></label>
  </div>
  <div className="category-tabs" role="group" aria-label="Filtrar por categoría"><button className={category==="all"?"active":""} onClick={()=>setCategory("all")}>Todos</button>{categories.map(item=><button className={category===item.id?"active":""} key={item.id} onClick={()=>setCategory(item.id)}>{item.name}</button>)}</div>
  {filtered.length?<div className="catalog-grid">{filtered.map(product=><ProductCard key={product.id} product={product}/>)}</div>:<div className="empty-catalog"><h3>No encontramos coincidencias.</h3><p>Probá con otra búsqueda o elegí todas las categorías.</p><button onClick={()=>{setQuery("");setCategory("all");}}>Limpiar filtros</button></div>}
 </div>;
}
