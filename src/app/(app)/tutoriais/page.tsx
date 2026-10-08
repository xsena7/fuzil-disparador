import Link from "next/link";
import { ArrowRight, Clock, GraduationCap } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { TUTORIALS } from "@/lib/tutorials";
import { PixelBug } from "@/components/pixel-bug";
import { TUTORIAL_ICONS } from "./icons";

export default async function TutorialsPage() {
  await requireAuth();
  const [first, ...rest] = TUTORIALS;
  const FirstIcon = TUTORIAL_ICONS[first.icon];
  return (
    <div className="mx-auto max-w-5xl">
      <div className="relative mb-8 overflow-hidden rounded-3xl bg-ink p-8 text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-orange-500/25 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-10 size-80 rounded-full bg-rose-600/20 blur-3xl" />
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-200"><GraduationCap className="size-3.5" /> Tutoriais</div>
          <h1 className="text-3xl font-semibold tracking-tight">Aprenda a usar o Fuzil Disparador</h1>
          <p className="mt-2 max-w-2xl text-zinc-300">Passo a passo de cada tela, com prints: como conectar BMs, criar templates, disparar campanhas e entender as métricas e os alertas.</p>
          <Link href={`/tutoriais/${first.slug}`} className="mt-6 inline-flex items-center gap-3 rounded-2xl bg-white/10 p-3 pr-5 ring-1 ring-white/15 transition hover:bg-white/15">
            <span className="flex size-10 items-center justify-center rounded-xl bg-brand-gradient"><FirstIcon className="size-5" /></span>
            <span>
              <span className="block font-semibold">Comece por aqui: {first.title}</span>
              <span className="block text-sm text-zinc-400">{first.summary}</span>
            </span>
            <ArrowRight className="ml-2 size-4" />
          </Link>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((t) => {
          const Icon = TUTORIAL_ICONS[t.icon];
          return (
            <Link key={t.slug} href={`/tutoriais/${t.slug}`} className="group rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <div className="mb-4 flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition group-hover:bg-brand-gradient group-hover:text-white"><Icon className="size-5" /></span>
                <span className="flex items-center gap-1 text-xs text-zinc-400"><Clock className="size-3.5" /> {t.minutes} min</span>
              </div>
              <div className="font-semibold text-zinc-900">{t.title}</div>
              <p className="mt-1 text-sm text-zinc-500">{t.summary}</p>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 flex items-center gap-4 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-5">
        <PixelBug className="size-10 shrink-0" />
        <p className="text-sm text-zinc-600">Achou algum erro no painel? Clique no bichinho no canto inferior direito da tela e conte o que aconteceu. Dá para anexar um print.</p>
      </div>
    </div>
  );
}
