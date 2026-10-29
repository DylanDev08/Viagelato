import type {ReactNode} from "react";
import type {Settings} from "@/lib/types";
import {FloatingActions} from "./floating-actions";
import {SiteFooter} from "./site-footer";
import {SiteHeader} from "./site-header";

export function SiteShell({settings,children,hideFloatingActions=false}:{settings:Settings;children:ReactNode;hideFloatingActions?:boolean}){
 return <><SiteHeader settings={settings}/>{children}<SiteFooter settings={settings}/>{!hideFloatingActions?<FloatingActions whatsapp={settings.whatsapp}/>:null}</>;
}
