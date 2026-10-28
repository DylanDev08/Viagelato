import manifest from "../../docs/viagelato/manifest_imagenes.json";

export type ProvisionalAsset={
 id:number;
 name:string;
 category:string;
 image:string;
 role:"producto_candidato"|"material_marca";
 status:"requiere_revision_comercial";
 note:string;
};

type ManifestRow={imagen_id:number;nombre_provisorio:string;categoria_tentativa:string;archivo_web:string;rol:string;estado:string;nota:string};

export const PROVISIONAL_ASSETS=(manifest as ManifestRow[]).map((row):ProvisionalAsset=>({
 id:row.imagen_id,
 name:row.nombre_provisorio,
 category:row.categoria_tentativa,
 image:row.archivo_web,
 role:row.rol==="material_marca"?"material_marca":"producto_candidato",
 status:"requiere_revision_comercial",
 note:row.nota,
}));

export const PROVISIONAL_CATEGORIES=[...new Set(PROVISIONAL_ASSETS.map(asset=>asset.category))].sort();
