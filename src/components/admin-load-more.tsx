"use client";
export function AdminLoadMore({label,loading,error,onLoad}:{
 label:string;loading:boolean;error:string;onLoad:()=>void;
}){
 return <div className="admin-pagination" aria-live="polite">
  {error?<p role="alert" className="notification notification-error">{error}</p>:null}
  <button type="button" className="btn ghost" disabled={loading} onClick={onLoad}>
   {loading?"Cargando pedidos…":label}
  </button>
 </div>;
}
