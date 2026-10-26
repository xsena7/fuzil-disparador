import { headers } from "next/headers";

/** Caminho de uma página do site público: no domínio do site é /vendas; acessando pelo painel, é /site/vendas. */
export async function sitePath(path: string) {
  const host = ((await headers()).get("host") ?? "").replace(/:\d+$/, "").replace(/^www\./, "");
  const site = (process.env.SITE_DOMAIN || "fuzildisparador.com.br").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const aliases = (process.env.SITE_ALIASES ?? `site.${site}`).split(",").map((h) => h.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, ""));
  return host === site || aliases.includes(host) ? path : `/site${path}`;
}
