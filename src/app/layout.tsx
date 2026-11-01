import type {Metadata} from "next";
import {CartProvider} from "@/components/cart";
import {publicSiteUrl} from "@/lib/seo";
import "./globals.css";
import "./storefront.css";
import "./provisional.css";
import "./monochrome.css";
import "./corte-03.css";
import "./corte-04.css";
import "./admin-corte04.css";
import "./contact-catalog-corte06.css";
import "./auth-recovery.css";
import "./mobile.css";
import "./admin-mobile-access.css";
import "./grouped-catalog.css";
import "./storefront-refresh.css";
import "./commercial-refinement.css";
import "./checkout-totals.css";
import "./admin-whatsapp-priority.css";

const siteUrl=publicSiteUrl();
const indexingEnabled=process.env.ENABLE_INDEXING==="true"&&siteUrl!==null;
export const metadata:Metadata={
 metadataBase:siteUrl?new URL(siteUrl):undefined,
 title:{default:"Viagelato | Logística y distribución",template:"%s | Viagelato"},
 description:"Logística y distribución de helados y alimentos congelados en zona sur de Buenos Aires.",
 applicationName:"Viagelato",
 robots:{index:indexingEnabled,follow:indexingEnabled},
 openGraph:{type:"website",locale:"es_AR",siteName:"Viagelato",title:"Viagelato | Logística y distribución",description:"Helados y alimentos congelados con entregas coordinadas por zona."},
};

export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="es" data-scroll-behavior="smooth"><body><CartProvider>{children}</CartProvider></body></html>}
