import {describe,expect,it} from "vitest";
import {PROVISIONAL_ASSETS,PROVISIONAL_BRAND_ASSETS,PROVISIONAL_PRODUCT_ASSETS} from "@/lib/provisional-catalog";

describe("curaduría del material recibido",()=>{
 it("conserva las 48 imágenes en el inventario",()=>expect(PROVISIONAL_ASSETS).toHaveLength(48));
 it("separa material de marca del catálogo público",()=>{expect(PROVISIONAL_BRAND_ASSETS).toHaveLength(2);expect(PROVISIONAL_PRODUCT_ASSETS.some(asset=>/logo seitu/i.test(asset.name))).toBe(false);});
 it("oculta la copia identificada sin borrar el original",()=>{expect(PROVISIONAL_PRODUCT_ASSETS.some(asset=>asset.id===12)).toBe(false);expect(PROVISIONAL_ASSETS.some(asset=>asset.id===12)).toBe(true);});
});
