import type { Metadata } from "next";
import { createHash } from "node:crypto";
import { MousePointerClick } from "lucide-react";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { CopyBtn } from "../copy";
import { EditLinkForm } from "./edit-form";

export const metadata: Metadata = { title: "Meu link do botão · Fuzil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (d: Date | null) => (d ? d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "ainda ninguém clicou");

/** Gerenciar um link (quem tem o link secreto): ver cliques e trocar o destino. */
export default async function ManageLinkPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const link = await prisma.externalLink.findUnique({ where: { editKeyHash: createHash("sha256").update(key).digest("hex") } });
  const shell = (children: React.ReactNode) => (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(700px circle at 10% 0%, rgba(249,115,22,.22), transparent 65%), radial-gradient(600px circle at 95% 100%, rgba(225,29,72,.18), transparent 65%)" }} />
      <div className="relative mx-auto max-w-2xl px-5 py-14 md:py-20">{children}</div>
    </section>
  );
  if (!link)
    return shell(
      <div className="rounded-3xl bg-white p-8 text-center text-zinc-700 shadow-2xl">
        <h1 className="text-xl font-semibold text-zinc-900">Link não encontrado</h1>
        <p className="mt-2 text-sm">Confira se copiou o endereço inteiro. Se o link foi apagado, crie um novo.</p>
        <a href="/links" className="mt-5 inline-block rounded-xl bg-brand-gradient px-5 py-2.5 font-semibold text-white">Criar um link</a>
      </div>,
    );
  const full = `https://${trackedUrlBase()}/${link.code}`;
  return shell(
    <>
      <div className="mb-6">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-200">Meu link do botão</div>
        <h1 className="text-3xl font-semibold tracking-tight">{link.name}</h1>
      </div>
      <div className="mb-5 grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl bg-white/[.06] p-5 ring-1 ring-white/10">
          <div className="text-xs uppercase tracking-wide text-zinc-400">Código do botão</div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="font-mono text-2xl font-bold text-orange-300">{link.code}</span>
            <CopyBtn text={link.code} />
          </div>
        </div>
        <div className="rounded-2xl bg-white/[.06] p-5 ring-1 ring-white/10">
          <div className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-zinc-400"><MousePointerClick className="size-3.5" /> Cliques</div>
          <div className="mt-1 text-2xl font-bold tabular-nums">{link.clicks.toLocaleString("pt-BR")}</div>
          <div className="text-xs text-zinc-400">Último: {when(link.lastClickAt)}</div>
        </div>
      </div>
      <div className="mb-5 flex items-center justify-between gap-2 rounded-2xl bg-white/[.06] px-5 py-3 ring-1 ring-white/10">
        <a href={full} target="_blank" rel="noreferrer" className="truncate text-sm text-sky-300 hover:underline">{full}</a>
        <CopyBtn text={full} />
      </div>
      <div className="rounded-3xl bg-white p-6 text-zinc-700 shadow-2xl sm:p-7">
        <EditLinkForm editKey={key} name={link.name} url={link.url} />
      </div>
      <p className="mt-4 text-center text-xs text-zinc-500">Não compartilhe este endereço: quem tiver ele consegue trocar o destino do seu botão.</p>
    </>,
  );
}
