"use client";

export default function AdminError({reset}:{error:Error & {digest?:string};reset:()=>void}){
 return <main style={{maxWidth:520,margin:"8vh auto",padding:24,fontFamily:"system-ui,sans-serif"}}>
  <h1 style={{fontSize:28}}>No se pudo cargar el administrador</h1>
  <p>La información no se modificó. Puede ser un problema temporal de conexión con la base de datos o con el servidor.</p>
  <button type="button" onClick={()=>reset()} style={{background:"#161616",color:"white",border:0,borderRadius:8,padding:"12px 18px",cursor:"pointer"}}>
   Volver a intentar
  </button>
  <p style={{fontSize:13,color:"#666",marginTop:18}}>Si vuelve a fallar, informá qué estabas intentando guardar. El error técnico queda registrado en el servidor para poder corregirlo.</p>
 </main>;
}
