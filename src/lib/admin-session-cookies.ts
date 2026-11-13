/** Session namespace independent from the legacy @supabase/ssr browser client.
 * Only server endpoints, server components and proxy can read these cookies.
 */
export const ADMIN_SERVER_COOKIE_NAME="viagelato-admin-server-v1";
export function adminServerCookieOptions(){
 return {
  name:ADMIN_SERVER_COOKIE_NAME,path:"/",httpOnly:true,
  sameSite:"lax" as const,secure:process.env.NODE_ENV==="production"
 };
}
export function serverAdminLoginAvailable(){
 return process.env.NEXT_PUBLIC_ADMIN_SERVER_LOGIN_ENABLED==="true"||
  process.env.ADMIN_SERVER_LOGIN_CANARY_ENABLED==="true";
}
export function isServerAdminCookie(name:string){
 return name===ADMIN_SERVER_COOKIE_NAME||name.startsWith(ADMIN_SERVER_COOKIE_NAME+".");
}
