import type { MetadataRoute } from "next";
import { headers } from "next/headers";
import { company } from "@/lib/company";

/** Site público: o Google pode ler tudo. Painel (app.*) e links curtos: não aparecem no Google. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const c = company();
  const host = ((await headers()).get("host") ?? "").replace(/:\d+$/, "");
  const siteHost = c.siteUrl.replace(/^https?:\/\//, "");
  const isSite = host === siteHost || host === `www.${siteHost}`;
  if (!isSite) return { rules: { userAgent: "*", disallow: "/" } };
  return { rules: { userAgent: "*", allow: "/", disallow: ["/vendas/pedido/"] }, sitemap: `${c.siteUrl}/sitemap.xml`, host: c.siteUrl };
}
