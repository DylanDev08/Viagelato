import {getStore} from "@/lib/site";
import {Checkout} from "@/components/checkout";
import {getPublicCatalog} from "@/lib/catalog-source";
export const dynamic="force-dynamic";
export default async function CartPage(){const [{products,zones,settings,demo,checkoutEnabled},catalogItems]=await Promise.all([getStore(),getPublicCatalog()]);return <Checkout {...{products,zones,settings,demo,checkoutEnabled,catalogItems}}/>;}
