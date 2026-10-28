import manifest from "../../docs/viagelato/manifest_imagenes.json";

export type ProvisionalAsset={
 id:number;
 name:string;
 category:string;
 image:string;
 role:"producto_candidato"|"material_de_marca";
 status:"requiere_revision_comercial";
 note:string;
};

type ManifestRow={imagen_id:number;nombre_provisorio:string;categoria_tentativa:string;archivo_web:string;rol:string;estado:string;nota:string};

export const PROVISIONAL_ASSETS=(manifest as ManifestRow[]).map((row):ProvisionalAsset=>({
 id:row.imagen_id,
 name:row.nombre_provisorio,
 category:row.categoria_tentativa,
 image:row.archivo_web,
 role:row.rol==="material_de_marca"?"material_de_marca":"producto_candidato",
 status:"requiere_revision_comercial",
 note:row.nota,
}));

const DUPLICATE_ASSET_IDS=new Set([12]);
export const PROVISIONAL_PRODUCT_ASSETS=PROVISIONAL_ASSETS.filter(asset=>asset.role==="producto_candidato"&&!DUPLICATE_ASSET_IDS.has(asset.id));
export const PROVISIONAL_BRAND_ASSETS=PROVISIONAL_ASSETS.filter(asset=>asset.role==="material_de_marca");
export const PROVISIONAL_CATEGORIES=[...new Set(PROVISIONAL_PRODUCT_ASSETS.map(asset=>asset.category))].sort();
