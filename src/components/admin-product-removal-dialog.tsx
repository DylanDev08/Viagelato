"use client";
import type {RefObject} from "react";
import {X} from "lucide-react";
import type {Product} from "@/lib/types";

export type ProductRemoval={product:Product;mode:"hide"|"delete"};

export function AdminProductRemovalDialog({
 removal,dialogRef,busy,confirmPermanent,onConfirmPermanentChange,onClose,onSubmit,error,
}:{
 removal:ProductRemoval;
 dialogRef:RefObject<HTMLElement|null>;
 busy:boolean;
 confirmPermanent:boolean;
 onConfirmPermanentChange:(checked:boolean)=>void;
 onClose:()=>void;
 onSubmit:()=>void;
 error:string;
}){
 return <div className="admin-product-modal-backdrop" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget&&!busy)onClose();}}>
   <section ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="admin-remove-title" aria-describedby="admin-remove-description" className="admin-product-remove-modal">
    <div className="admin-product-modal-top"><span>CONFIRMAR OPERACIÓN</span><button type="button" data-dialog-autofocus disabled={busy} aria-label="Cancelar eliminación" onClick={()=>onClose()}><X size={21} aria-hidden="true"/></button></div>
    <h2 id="admin-remove-title">{removal.mode==="hide"?"Ocultar producto":"Eliminar producto definitivamente"}</h2>
    <p id="admin-remove-description"><strong>{removal.product.name}</strong></p>
    {removal.mode==="hide"?<p>Dejará de mostrarse en la tienda, pero seguirá disponible para editarlo o eliminarlo después.</p>:
      <><p>Esta acción es irreversible. Solo se permite eliminar un producto oculto y sin pedidos asociados.</p>
      <label className="admin-remove-check"><input type="checkbox" checked={confirmPermanent} onChange={event=>onConfirmPermanentChange(event.target.checked)}/> Entiendo que se eliminará definitivamente.</label></>}
    {error&&<p role="alert" className="notification notification-error">{error}</p>}
    <div className="admin-product-remove-actions"><button type="button" className="btn ghost" disabled={busy} onClick={()=>onClose()}>Cancelar</button><button type="button" className="btn danger" disabled={busy||(removal.mode==="delete"&&!confirmPermanent)} onClick={()=>void onSubmit()}>{busy?"Procesando…":removal.mode==="hide"?"Ocultar de la tienda":"Eliminar definitivamente"}</button></div>
   </section>
  </div>;
}
