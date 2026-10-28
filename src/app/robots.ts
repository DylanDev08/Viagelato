import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
 const base = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
 const published = process.env.ENABLE_INDEXING === "true";
 return {
  rules: published
   ? [{ userAgent: "*", allow: "/", disallow: ["/admin", "/api", "/login"] }]
   : [{ userAgent: "*", disallow: "/" }],
  ...(published ? { sitemap: `${base}/sitemap.xml` } : {}),
 };
}
