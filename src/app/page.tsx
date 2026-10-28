import {getStore} from "@/lib/site";
import type {Metadata} from "next";
import {Storefront} from "@/components/storefront";
export const dynamic="force-dynamic";
export async function generateMetadata():Promise<Metadata>{const {settings}=await getStore();return {title:settings.name,description:settings.description};}
export default async function Home(){const {settings,products,categories,banners,demo}=await getStore();return <Storefront {...{settings,products,categories,banners,demo}}/>;}
