import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import { env } from "@/lib/env";
import { Logo } from "@/components/brand";
import { briefTemplate } from "@/lib/briefs";
import { templateShape, type VarSource, type VariableMapping } from "@/lib/template-utils";
import { BriefForm } from "./brief-form";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Monte sua campanha · Fuzil", robots: { index: false, follow: false } };

/** Link do cliente: ele preenche a campanha (template já escolhido pelo dono do Fuzil) e manda. Sem login. */
export default async function BriefPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const brief = /^[\w-]{10,40}$/.test(token) ? await prisma.campaignBrief.findUnique({ where: { token } }) : null;
  const components = brief ? await briefTemplate(brief.workspaceId, brief.templateName, brief.templateLanguage) : null;

  return (
    <div className="min-h-screen bg-[#090a0d] text-white" style={{ backgroundImage: "radial-gradient(700px circle at 85% -10%, rgba(255,106,0,.18), transparent 60%)" }}>
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex items-center justify-between rounded-full border border-white/10 bg-black/30 px-4 py-2.5">
          <Logo className="h-6 w-auto" />
          <span className="text-xs text-zinc-400">Monte sua campanha</span>
        </div>
        {!brief || !components ? (
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center">
            <h1 className="text-2xl font-semibold">Este link não existe mais</h1>
            <p className="mt-2 text-zinc-400">Peça um link novo para quem te enviou.</p>
          </div>
        ) : brief.status === "IMPORTED" ? (
          <div className="rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.05] p-10 text-center">
            <h1 className="text-2xl font-semibold">Campanha recebida e montada ✓</h1>
            <p className="mt-2 text-zinc-300">A nossa equipe já está cuidando do seu disparo. Para mudar algo, fale com quem te enviou o link.</p>
          </div>
        ) : (
          <BriefForm
            token={token}
            components={components}
            shape={templateShape(components, env.redirectDomain())}
            initial={{
              campaignName: brief.campaignName ?? "",
              mapping: (brief.variableMapping as unknown as VariableMapping) ?? {},
              buttonUrl: brief.buttonUrl ?? "",
              mediaUrl: brief.headerMediaUrl,
              audienceFileName: brief.audienceFileName,
              audienceRows: brief.audienceRows,
              hasPhoto: Boolean(brief.profilePhoto),
              notes: brief.notes ?? "",
              submitted: brief.status === "SUBMITTED",
            }}
          />
        )}
        <p className="mt-10 text-center text-xs text-zinc-600">Fuzil Disparador · disparos pela API oficial do WhatsApp</p>
      </div>
    </div>
  );
}

export type BriefInitial = {
  campaignName: string;
  mapping: VariableMapping;
  buttonUrl: string;
  mediaUrl: string | null;
  audienceFileName: string | null;
  audienceRows: number | null;
  hasPhoto: boolean;
  notes: string;
  submitted: boolean;
};
export type { VarSource };
