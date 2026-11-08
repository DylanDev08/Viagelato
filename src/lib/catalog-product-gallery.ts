import type {CatalogPriceItem} from "./catalog-prices";

export type CatalogAdditionalImage={src:string;alt:string};

// Solo imágenes verificadas del mismo producto. No reutilizar fotografías de
// otros artículos para cubrir huecos del proveedor.
const additionalBySourceRow:Record<number,CatalogAdditionalImage[]>={
  10:[{src:"/catalogo/carita-ch-v.webp",alt:"Helado Carita chocolate y vainilla"}],
};

export function additionalCatalogImages(item:Pick<CatalogPriceItem,"sourceRow">):CatalogAdditionalImage[]{
 return additionalBySourceRow[item.sourceRow]??[];
}
