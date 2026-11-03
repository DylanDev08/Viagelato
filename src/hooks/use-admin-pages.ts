"use client";
import {useEffect,useRef,useState} from "react";

type Row={id:string;created_at:string};
type Page<T>={items:T[];nextCursor:string|null};
export type AdminPagesKind="orders"|"requests";

/** El servidor entrega la primera página; más datos se consultan bajo demanda. */
export function useAdminPages<T extends Row>(
 kind:AdminPagesKind,initial:T[],initialCursor:string|null
){
 const [items,setItems]=useState<T[]>(initial);
 const [cursor,setCursor]=useState<string|null>(initialCursor);
 const [loading,setLoading]=useState(false);
 const [error,setError]=useState("");
 const fetching=useRef(false);
 useEffect(()=>{
  setItems(initial);
  setCursor(initialCursor);
  setError("");
 },[initial,initialCursor]);

 async function loadMore(){
  if(!cursor||fetching.current)return;
  fetching.current=true;
  setLoading(true);setError("");
  try{
   const url=new URL("/api/admin/pages",window.location.origin);
   url.searchParams.set("kind",kind);
   url.searchParams.set("cursor",cursor);
   const response=await fetch(url.pathname+url.search,{credentials:"same-origin",cache:"no-store"});
   const json:unknown=await response.json().catch(()=>null);
   if(!response.ok||!json||typeof json!=="object")
    throw new Error(response.status===401?"Tu sesión venció. Volvé a iniciar sesión.":"No se pudieron cargar más pedidos.");
   const page=json as Partial<Page<T>>;
   if(!Array.isArray(page.items)||!(page.nextCursor===null||typeof page.nextCursor==="string"))
    throw new Error("La respuesta del servidor no es válida.");
   setItems(current=>{
    const ids=new Set(current.map(x=>x.id));
    return [...current,...page.items!.filter(x=>x&&typeof x.id==="string"&&!ids.has(x.id))];
   });
   setCursor(page.nextCursor);
  }catch(e){setError(e instanceof Error?e.message:"No se pudieron cargar más pedidos.");}
  finally{setLoading(false);fetching.current=false;}
 }
 return {items,hasMore:cursor!==null,loading,error,loadMore};
}
