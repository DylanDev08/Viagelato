import type {Product} from "./types";

/** Published products have managed stock; imported inquiry rows keep stock unknown. */
export function productQuantityLimit(product:Pick<Product,"stock"|"price"|"active"|"commercially_verified">):number{
 return product.active&&product.commercially_verified&&Number.isFinite(Number(product.price))&&Number(product.price)>0&&Number.isInteger(product.stock)
  ?Math.max(0,Math.min(product.stock,99)):0;
}
