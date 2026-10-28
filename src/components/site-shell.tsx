import type {ReactNode} from "react";
import type {Settings} from "@/lib/types";
import {FloatingActions} from "./floating-actions";
import {SiteFooter} from "./site-footer";
import {SiteHeader} from "./site-header";

export function SiteShell({settings,children}:{settings:Settings;children:ReactNode}){
 return <><SiteHeader settings={settings}/>{children}<SiteFooter settings={settings}/><FloatingActions whatsapp={settings.whatsapp}/></>;
}
