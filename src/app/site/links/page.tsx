import type { Metadata } from "next";
import { MousePointerClick, PencilLine, Send } from "lucide-react";
import { trackedUrlBase } from "@/lib/env";
import { CreateLinkForm } from "./form";

export const metadata: Metadata = { title: "Gerador de links do botão · Fuzil", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STEPS = [
  { icon: PencilLine, title: "Crie o link", text: "Dê um nome e cole o site para onde a pessoa deve ir quando clicar no botão." },
  { icon: Send, title: "Use o código no disparo", text: "Na sua plataforma de disparo, cole o código na variável do botão ({{1}}) do template." },
  { icon: MousePointerClick, title: "Pronto", text: "Quem clicar no botão vai direto para o seu site. Você troca o destino quando quiser." },
];

/** Site público (sem login): clientes criam o código do botão para disparar o template do Fuzil por outra plataforma. */
export default function PublicLinksPage() {
  const base = trackedUrlBase();
  return (
    <section className="relative overflow-hidden bg-ink text-white">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(700px circle at 10% 0%, rgba(249,115,22,.22), transparent 65%), radial-gradient(600px circle at 95% 100%, rgba(225,29,72,.18), transparent 65%)" }} />
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
          <p className="mt-8 max-w-xl text-xs text-zinc-500">
            O botão aprovado abre <code className="text-zinc-300">https://{base}/</code> seguido do código. Por isso, na variável do botão vai <b className="text-zinc-300">só o código</b>, sem o resto do endereço.
          </p>
        </div>
        <CreateLinkForm />
      </div>
    </section>
  );
}
