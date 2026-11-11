import type { Metadata } from "next";
import { company } from "@/lib/company";
import { MetaPixel } from "@/components/meta-pixel";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const c = company();
  return {
    title: "Fuzil Disparador · A gente dispara pra você no WhatsApp",
    description: "Disparo em massa no WhatsApp pela API oficial, feito pela nossa equipe. Lista higienizada, relatório ao vivo e pacotes com até 47% de desconto: a partir de R$ 0,16 por disparo.",
    metadataBase: new URL(c.siteUrl),
    // Um código por BM (dá para colar vários, separados por vírgula ou espaço)
    ...(c.domainVerification ? { other: { "facebook-domain-verification": c.domainVerification.split(/[\s,;]+/).filter(Boolean) } } : {}),
  };
}

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  const pixelId = env.metaPixelId();
  return (
    <>
      {pixelId && <MetaPixel pixelId={pixelId} />}
      {children}
    </>
  );
}
