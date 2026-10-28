import {getStore} from "@/lib/site";
import {Checkout} from "@/components/checkout";
export const dynamic="force-dynamic";
export default async function CartPage(){const {products,zones,settings,demo,checkoutEnabled}=await getStore();return <Checkout {...{products,zones,settings,demo,checkoutEnabled}}/>;}
