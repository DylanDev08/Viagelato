import {redirect} from "next/navigation";
import {assertAdmin} from "@/lib/supabase";
import {privatePageMetadata} from "@/lib/seo";
export const metadata=privatePageMetadata("Administración");
export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}){try{await assertAdmin();}catch{redirect("/login");}return <>{children}</>;}
