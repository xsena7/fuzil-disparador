import type { MetadataRoute } from "next";
import { company } from "@/lib/company";
import { publicErrors } from "@/lib/seo-errors";
import { TUTORIALS } from "@/lib/tutorials";

/** Mapa do site público (fuzildisparador.com.br) para o Google achar as páginas. O painel fica de fora. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = company().siteUrl;
  const page = (path: string, priority: number): MetadataRoute.Sitemap[number] => ({ url: `${base}${path}`, changeFrequency: "weekly", priority });
  return [
    page("", 1),
    page("/vendas", 0.8),
    page("/perguntas", 0.8),
    page("/guias", 0.7),
    ...TUTORIALS.map((t) => page(`/guias/${t.slug}`, 0.6)),
    page("/erros", 0.7),
    ...publicErrors().map((e) => page(`/erros/${e.code}`, 0.6)),
    page("/links", 0.4),
    page("/termos", 0.2),
    page("/privacidade", 0.2),
  ];
}
