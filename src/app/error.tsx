"use client";
import Link from "next/link";

export default function StoreError({reset}:{error:Error&{digest?:string};reset:()=>void}){
 return <main className="shell legal-page"><h1>No pudimos cargar esta página</h1>
  <p>Revisá tu conexión y volvé a intentar. Tu carrito permanece guardado en este navegador.</p>
  <button type="button" className="btn primary" onClick={reset}>Volver a intentar</button>{" "}
  <Link href="/">Volver al inicio</Link>
 </main>;
}
