import {isAllowedMutationOrigin} from "./request-security";

/** Compatibilidad semántica para las escrituras administrativas. */
export function isAllowedAdminMutation(
 request:Request,
 siteUrl=process.env.NEXT_PUBLIC_SITE_URL,
 extraOrigins=process.env.ADMIN_ALLOWED_ORIGINS,
):boolean{
 return isAllowedMutationOrigin(request,siteUrl,extraOrigins);
}
