import type {Metadata} from "next";
import {CartProvider} from "@/components/cart";
import "./globals.css";
import "./storefront.css";
import "./provisional.css";

const siteUrl=process.env.NEXT_PUBLIC_SITE_URL;
const indexing=process.env.ENABLE_INDEXING==="true";
export const metadata:Metadata={
 metadataBase:siteUrl?new URL(siteUrl):undefined,
 title:{default:"Viagelato | Logística y distribución",template:"%s | Viagelato"},
 description:"Logística y distribución de helados y alimentos congelados en zona sur de Buenos Aires.",
 applicationName:"Viagelato",
 robots:{index:indexing,follow:indexing},
 openGraph:{type:"website",locale:"es_AR",siteName:"Viagelato",title:"Viagelato | Logística y distribución",description:"Helados y alimentos congelados con entregas coordinadas por zona."},
};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es" data-scroll-behavior="smooth"><body><CartProvider>{children}</CartProvider></body></html>}
