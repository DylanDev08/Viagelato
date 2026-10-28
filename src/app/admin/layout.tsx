import {redirect} from "next/navigation";
import {assertAdmin} from "@/lib/supabase";
export const dynamic="force-dynamic";
export default async function AdminLayout({children}:{children:React.ReactNode}){try{await assertAdmin();}catch{redirect("/login");}return <>{children}</>;}
