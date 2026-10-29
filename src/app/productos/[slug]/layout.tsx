import {ProductStructuredData} from "@/components/product-structured-data";
import {getProductBySlug} from "@/lib/site";

export default async function ProductLayout({children,params}:{children:React.ReactNode;params:Promise<{slug:string}>}){
 const siteUrl=process.env.NEXT_PUBLIC_SITE_URL;
 if(!siteUrl)return children;
 const {slug}=await params;
 const {product}=await getProductBySlug(slug);
 return <>{product?<ProductStructuredData product={product} siteUrl={siteUrl}/>:null}{children}</>;
}
