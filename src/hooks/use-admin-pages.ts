"use client";
import {useRef,useState} from "react";

type Row={id:string;created_at:string};
type Page<T>={items:T[];nextCursor:string|null};
export type AdminPagesKind="orders"|"requests";
type Snapshot<T>={source:T[];sourceCursor:string|null;items:T[];cursor:string|null;error:string;loading:boolean};

/**
 * La primera página viene del servidor. Los props pueden cambiar tras
 * router.refresh(): derivar el snapshot nuevo sin setState dentro de un
 * useEffect evita renders en cascada y no pierde el estado de otros formularios.
 */
export function useAdminPages<T extends Row>(
 kind:AdminPagesKind,initial:T[],initialCursor:string|null
){
 const [saved,setSaved]=useState<Snapshot<T>>(()=>({
  source:initial,sourceCursor:initialCursor,items:initial,cursor:initialCursor,error:"",loading:false
 }));
 const fetching=useRef(false);
 const current:Snapshot<T>=saved.source===initial&&saved.sourceCursor===initialCursor
  ?saved:{source:initial,sourceCursor:initialCursor,items:initial,cursor:initialCursor,error:"",loading:false};

 async function loadMore(){
  if(!current.cursor||fetching.current)return;
  fetching.current=true;
  setSaved({...current,loading:true,error:""});
  try{
   const url=new URL("/api/admin/pages",window.location.origin);
   url.searchParams.set("kind",kind);
   url.searchParams.set("cursor",current.cursor);
   const response=await fetch(url.pathname+url.search,{credentials:"same-origin",cache:"no-store"});
   const json:unknown=await response.json().catch(()=>null);
   if(!response.ok||!json||typeof json!=="object")
    throw new Error(response.status===401?"Tu sesión venció. Volvé a iniciar sesión.":"No se pudieron cargar más pedidos.");
   const page=json as Partial<Page<T>>;
   if(!Array.isArray(page.items)||!(page.nextCursor===null||typeof page.nextCursor==="string"))
    throw new Error("La respuesta del servidor no es válida.");
   const ids=new Set(current.items.map(x=>x.id));
   const nextItems=[...current.items,...page.items.filter(x=>x&&typeof x.id==="string"&&!ids.has(x.id))];
   setSaved({...current,items:nextItems,cursor:page.nextCursor,error:"",loading:false});
  }catch(e){
   setSaved({...current,error:e instanceof Error?e.message:"No se pudieron cargar más pedidos.",loading:false});
  }finally{fetching.current=false;}
 }
 return {items:current.items,hasMore:current.cursor!==null,loading:current.loading,error:current.error,loadMore};
}
