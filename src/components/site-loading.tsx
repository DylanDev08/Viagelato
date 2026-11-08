import {Snowflake,Truck} from "lucide-react";

/**
 * Suspense real: no simulamos pasos de verificación ni agregamos esperas
 * artificiales. La animación indica actividad sin inventar un porcentaje.
 */
export function SiteLoading({admin=false}:{admin?:boolean}){
 return <main className="viagelato-loading" role="status" aria-live="polite" aria-busy="true">
  <div className="viagelato-loading-scene" aria-hidden="true">
   <span className="viagelato-loading-orbit viagelato-loading-orbit-one"/>
   <span className="viagelato-loading-orbit viagelato-loading-orbit-two"/>
   <span className="viagelato-loading-flake"><Snowflake size={26} strokeWidth={1.4}/></span>
   <span className="viagelato-loading-mark">V<span>.</span></span>
   <span className="viagelato-loading-route"><Truck size={18} strokeWidth={1.6}/></span>
  </div>
  <div className="viagelato-loading-copy">
   <p className="viagelato-loading-eyebrow">VIAGELATO · LOGÍSTICA Y DISTRIBUCIÓN</p>
   <h1>{admin?"Preparando tu panel":"Preparando algo fresco"}</h1>
   <p className="viagelato-loading-caption">{admin?"Cargando tus herramientas de gestión…":"Estamos cargando los helados, productos y presentaciones…"}</p>
  </div>
  <div className="viagelato-loading-track" aria-hidden="true"><span/></div>
  <p className="viagelato-loading-footnote">HELADOS &amp; CONGELADOS · ZONA SUR</p>
 </main>;
}
