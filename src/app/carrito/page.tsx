import {getStore,getPublishedCatalog} from "@/lib/site";
import {Checkout} from "@/components/checkout";
export const dynamic="force-dynamic";
export default async function CartPage(){const [store,catalogItems]=await Promise.all([getStore(),getPublishedCatalog()]);return <Checkout {...store} catalogItems={catalogItems}/>;}
