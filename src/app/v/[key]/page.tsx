import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { resolveFunnel } from "@/lib/funnel-public";
import { funnelPage } from "@/lib/funnels";
import { Pixel } from "./pixel";
import { TechLanding } from "./tech-landing";

export const dynamic = "force-dynamic";
export const viewport: Viewport = { themeColor: "#05060b" };

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const funnel = await resolveFunnel((await params).key);
  if (!funnel) return { title: "Página não encontrada" };
  const p = funnelPage(funnel);
  return { title: `${p.jobTitle} · ${p.company}`, description: p.subtitle, robots: { index: false }, openGraph: { title: p.headline, description: p.subtitle } };
}

export default async function Landing({ params, searchParams }: { params: Promise<{ key: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const { key } = await params;
  const funnel = await resolveFunnel(key);
  if (!funnel) notFound();
  const page = funnelPage(funnel);
  const sp = await searchParams;
  const utm = Object.fromEntries(
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "fbclid"].flatMap((k) => (typeof sp[k] === "string" ? [[k, sp[k] as string]] : [])),
  );
  // Domínio próprio: links relativos; pelo painel: /v/<slug>
  const base = key.includes(".") ? "" : `/v/${funnel.slug}`;

  return (
    <>
      {funnel.pixelId && <Pixel id={funnel.pixelId} />}
      <TechLanding
        page={page}
        jobs={page.jobs.filter((j) => j.open)}
        funnelKey={key}
        utm={utm}
        privacyHref={`${base}/privacidade`}
        open={funnel.status === "ACTIVE"}
      />
    </>
  );
}
