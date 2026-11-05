/** Suspense fallback real: no fake Cloudflare verification or artificial delays. */
export function SiteLoading({admin=false}:{admin?:boolean}){
 return <main className="viagelato-loading" role="status" aria-live="polite" aria-busy="true">
  <div className="viagelato-loading-mark" aria-hidden="true">V.</div>
  <p className="viagelato-loading-eyebrow">VIAGELATO</p>
  <h1>{admin?"Preparando el panel":"Preparando tu tienda"}</h1>
  <div className="viagelato-loading-track" aria-hidden="true"><span/></div>
  <p className="viagelato-loading-caption">{admin?"Verificando la sesión antes de cargar los datos…":"Cargando los productos y las presentaciones… "}</p>
 </main>;
}
