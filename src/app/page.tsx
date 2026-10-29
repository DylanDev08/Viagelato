import {getStore,getPublishedCatalog} from "@/lib/site";
import type {Metadata} from "next";
import {Storefront} from "@/components/storefront";
export const dynamic="force-dynamic";
export async function generateMetadata():Promise<Metadata>{const {settings}=await getStore();return {title:settings.name,description:settings.description};}
export default async function Home(){const [store,catalogItems]=await Promise.all([getStore(),getPublishedCatalog()]);return <Storefront {...store} catalogItems={catalogItems}/>;}
