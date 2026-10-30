import {StructuredData} from "@/components/structured-data";
import {publicSiteUrl} from "@/lib/seo";
import {organizationData} from "@/lib/structured-data";
import {getStore} from "@/lib/site";
import type {Metadata} from "next";
import {Storefront} from "@/components/storefront";
import {getPublicCatalog} from "@/lib/catalog-source";
export const dynamic="force-dynamic";
export async function generateMetadata():Promise<Metadata>{const {settings}=await getStore();return {title:settings.name,description:settings.description,alternates:{canonical:"/"}};}
export default async function Home(){const [{settings,products,categories,banners,demo},catalogItems]=await Promise.all([getStore(),getPublicCatalog()]);const base=publicSiteUrl();return <>{base?<StructuredData data={organizationData(settings,base)}/>:null}<Storefront {...{settings,products,categories,banners,demo,catalogItems}}/></>;}
