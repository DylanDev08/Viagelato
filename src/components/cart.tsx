"use client";
import {createContext,useContext,useEffect,useMemo,useState} from "react";
import type {CartLine} from "@/lib/types";

type CartContext={items:CartLine[];count:number;add:(id:string,quantity?:number,maxStock?:number)=>void;setQuantity:(id:string,n:number)=>void;clear:()=>void};
const ctx=createContext<CartContext|null>(null);
const CART_KEY="viagelato-cart:v1";
const LEGACY_CART_KEY="dist-cart";
function validLines(value:unknown):CartLine[]{
 if(!Array.isArray(value))return [];
 return value.filter((line):line is CartLine=>Boolean(line)&&typeof line.id==="string"&&Number.isInteger(line.quantity)&&line.quantity>0&&line.quantity<=99).slice(0,50);
}
function readCart(){
 try{const stored=localStorage.getItem(CART_KEY)??localStorage.getItem(LEGACY_CART_KEY);const lines=validLines(JSON.parse(stored||"[]"));if(!localStorage.getItem(CART_KEY)&&stored){localStorage.setItem(CART_KEY,JSON.stringify(lines));localStorage.removeItem(LEGACY_CART_KEY);}return lines;}catch{return [];}
}
function saveCart(items:CartLine[]){try{localStorage.setItem(CART_KEY,JSON.stringify(items));}catch{/* almacenamiento deshabilitado o sin espacio */}}
export function CartProvider({children}:{children:React.ReactNode}){
 const [items,setItems]=useState<CartLine[]>([]);const [ready,setReady]=useState(false);
 useEffect(()=>{const timer=window.setTimeout(()=>{setItems(current=>current.length?current:readCart());setReady(true);},0);return()=>window.clearTimeout(timer);},[]);
 useEffect(()=>{if(ready)saveCart(items);},[items,ready]);
 const value=useMemo(()=>({items,count:items.reduce((s,i)=>s+i.quantity,0),add:(id:string,quantity=1,maxStock=99)=>setItems(prev=>{const limit=Number.isFinite(maxStock)?Math.max(0,Math.min(Math.floor(maxStock),99)):0;if(!limit||!Number.isFinite(quantity))return prev;const amount=Math.max(1,Math.min(Math.floor(quantity),limit));const x=prev.find(i=>i.id===id);return x?prev.map(i=>i.id===id?{...i,quantity:Math.min(i.quantity+amount,limit)}:i):[...prev,{id,quantity:amount}];}),setQuantity:(id:string,n:number)=>setItems(prev=>n<=0?prev.filter(i=>i.id!==id):prev.map(i=>i.id===id?{...i,quantity:Math.min(n,99)}:i)),clear:()=>setItems([])}),[items]);
 return <ctx.Provider value={value}>{children}</ctx.Provider>;
}
export function useCart(){const value=useContext(ctx);if(!value)throw new Error("CartProvider requerido");return value;}
