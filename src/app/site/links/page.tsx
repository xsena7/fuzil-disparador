import type { Metadata } from "next";
import { MousePointerClick, PencilLine, Send } from "lucide-react";
import { prisma } from "@/lib/db";
import { trackedUrlBase } from "@/lib/env";
import { firstName } from "@/lib/template-utils";
import { linksAuth } from "@/lib/links-auth";
import { LoginForm } from "./login-form";
import { LinkCard, NewLinkForm } from "./my-links";
import { LogoutButton } from "./logout";

export const metadata: Metadata = { title: "Gerador de links do botão · Fuzil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STEPS = [
  { icon: PencilLine, title: "Crie o link", text: "Dê um nome e cole o site para onde a pessoa deve ir quando clicar no botão." },
  { icon: Send, title: "Use o código no disparo", text: "Na sua plataforma de disparo, cole o código na variável do botão ({{1}}) do template." },
  { icon: MousePointerClick, title: "Pronto", text: "Quem clicar no botão vai direto para o seu site. Você troca o destino quando quiser." },
];

const BG = { background: "radial-gradient(700px circle at 10% 0%, rgba(249,115,22,.22), transparent 65%), radial-gradient(600px circle at 95% 100%, rgba(225,29,72,.18), transparent 65%)" };

/** Gerador de links (site público): o cliente entra com e-mail e senha e cria o código do botão. */
export default async function PublicLinksPage() {
  const base = trackedUrlBase();
  const auth = await linksAuth();

  if (auth) {
    const links = await prisma.externalLink.findMany({ where: { accountId: auth.account.id }, orderBy: { createdAt: "desc" } });
    return (
      <section className="relative min-h-[80vh] overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute inset-0" style={BG} />
        <div className="relative mx-auto max-w-4xl px-5 py-12 md:py-16">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-200">Gerador de links do botão</div>
              <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Olá, {firstName(auth.account.name) || auth.account.name}!</h1>
              <p className="mt-2 text-zinc-400">
                Cole o código na variável do botão ({"{{1}}"}). O botão abre <code className="text-zinc-300">https://{base}/</code> + o código.
              </p>
            </div>
            <LogoutButton />
          </div>
          <NewLinkForm />
          <div className="mt-8 space-y-3">
            {links.length === 0 ? (
              <p className="rounded-2xl bg-white/[.06] px-5 py-8 text-center text-zinc-400 ring-1 ring-white/10">Você ainda não tem links. Crie o primeiro acima.</p>
            ) : (
              links.map((l) => (
                <LinkCard key={l.id} base={base} link={{ id: l.id, name: l.name, code: l.code, url: l.url, clicks: l.clicks, lastClickAt: l.lastClickAt?.toISOString() ?? null }} />
              ))
            )}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-0" style={BG} />
      <div className="relative mx-auto grid max-w-6xl items-start gap-10 px-5 py-14 md:grid-cols-[1.1fr_1fr] md:py-20">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-200">Gerador de links do botão</div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            O botão do template, <span className="bg-brand-gradient bg-clip-text text-transparent">na sua plataforma</span>.
          </h1>
          <p className="mt-5 max-w-xl text-lg text-zinc-300">
            Vai disparar um template do Fuzil por outra plataforma? Crie aqui o código do botão para ele levar a pessoa para o seu site.
          </p>
          <ol className="mt-9 space-y-4">
            {STEPS.map((s, i) => (
              <li key={s.title} className="flex gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white/10 text-orange-300"><s.icon className="size-5" /></span>
                <span>
                  <b className="block text-white">{i + 1}. {s.title}</b>
                  <span className="text-sm text-zinc-400">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <LoginForm />
      </div>
    </section>
  );
}
