"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowUpRight, X } from "lucide-react";
import type { FunnelPage, Job } from "@/lib/funnel-types";
import { Signup } from "./signup";

type Props = { page: FunnelPage; jobs: Job[]; funnelKey: string; utm: Record<string, string>; privacyHref: string; open: boolean };

const pad = (n: number) => String(n).padStart(2, "0");

/** Hora de Brasília no topo (detalhe pequeno, atualiza a cada 10s). */
function Clock() {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{now || "--:--"}</span>;
}

export function TechLanding({ page, jobs, funnelKey, utm, privacyHref, open }: Props) {
  const areas = useMemo(() => [...new Set(jobs.map((j) => j.area).filter(Boolean))], [jobs]);
  const [area, setArea] = useState("");
  const [q, setQ] = useState("");
  const [panel, setPanel] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const shown = jobs.filter((j) => (!area || j.area === area) && (!q || `${j.title} ${j.area}`.toLowerCase().includes(q.toLowerCase())));
  const active = jobs.find((j) => j.id === panel);
  const words = page.headline.split(" ");
  const last = words.pop();

  useEffect(() => {
    document.body.style.overflow = panel ? "hidden" : "";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setPanel(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [panel]);

  const apply = (id: string) => {
    setSelected(id);
    setPanel(id || "geral");
  };

  return (
    <div
      style={{ "--c": page.color, fontFamily: '"Inter Tight", "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif' } as React.CSSProperties}
      className="min-h-screen bg-[#f3f1ec] text-[#111] antialiased selection:bg-[var(--c)] selection:text-white"
    >
      <style>{`
        @keyframes ticker { to { transform: translateX(-50%) } }
        @keyframes slidein { from { transform: translateX(100%) } to { transform: none } }
        @keyframes up { from { transform: translateY(100%) } to { transform: none } }
        @keyframes draw { from { stroke-dashoffset: 400 } to { stroke-dashoffset: 0 } }
        .panel { animation: up .35s cubic-bezier(.16,1,.3,1) both }
        @media (min-width: 768px) { .panel { animation-name: slidein } }
        .mono { font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace }
      `}</style>

      {/* Barra de cima */}
      <div className="mono flex items-center justify-between border-b border-black/10 px-5 py-2.5 text-[11px] uppercase tracking-wider text-black/60 md:px-10">
        <span className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[var(--c)]" /> Contratando
        </span>
        <span>
          Brasília <Clock />
        </span>
      </div>

      <nav className="flex items-center justify-between px-5 py-5 md:px-10">
        <span className="text-lg font-bold tracking-tight">
          {page.company}
          <span className="text-[var(--c)]">.</span>
        </span>
        <a href="#vagas" className="group flex items-center gap-1 text-sm font-medium">
          Vagas <sup className="mono text-[10px] text-black/50">{pad(jobs.length)}</sup>
          <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </a>
      </nav>

      {/* Título */}
      <header className="px-5 pb-12 pt-10 md:px-10 md:pb-20 md:pt-16">
        <h1 className="max-w-6xl text-[13vw] font-semibold leading-[0.9] tracking-[-0.045em] md:text-[7.5vw]">
          {words.join(" ")}{" "}
          <span className="relative inline-block whitespace-nowrap">
            {last}
            <svg aria-hidden viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute -bottom-[0.08em] left-0 h-[0.14em] w-full text-[var(--c)]">
              <path d="M2 14 C 60 4, 140 4, 298 10" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeDasharray="400" style={{ animation: "draw 1.1s .3s ease-out both" }} />
            </svg>
          </span>
        </h1>
        <div className="mt-10 grid gap-8 md:mt-14 md:grid-cols-[1.2fr_1fr]">
          <p className="max-w-xl text-lg leading-relaxed text-black/70 md:text-xl">{page.subtitle}</p>
          <dl className="mono grid grid-cols-2 border-t border-black/15 text-xs">
            {[
              ["Modelo", "100% remoto"],
              ["Local", page.location?.split("·").pop()?.trim() || "Brasil"],
              ["Vagas abertas", pad(jobs.length)],
              ["Processo", "Pelo WhatsApp"],
            ].map(([k, v]) => (
              <div key={k} className="border-b border-black/15 py-3 pr-3">
                <dt className="uppercase tracking-wider text-black/45">{k}</dt>
                <dd className="mt-1 text-sm text-black">{v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </header>

      {/* Faixa rolando */}
      {jobs.length > 0 && (
        <div className="overflow-hidden border-y border-black bg-[#111] py-3 text-[#f3f1ec]">
          <div className="flex w-max" style={{ animation: "ticker 40s linear infinite" }}>
            {[0, 1].map((k) => (
              <div key={k} className="flex shrink-0">
                {[...jobs, ...jobs].map((j, i) => (
                  <span key={`${k}${i}`} className="flex items-center gap-6 pr-6 text-sm font-medium uppercase tracking-wide">
                    {j.title}
                    <span className="size-1.5 rounded-full bg-[var(--c)]" />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Vagas */}
      <section id="vagas" className="scroll-mt-4 px-5 py-14 md:px-10 md:py-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <h2 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">Vagas abertas</h2>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar..."
            className="w-full border-b border-black/30 bg-transparent py-2 text-base outline-none placeholder:text-black/35 focus:border-black md:w-64"
          />
        </div>
        {areas.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {["", ...areas].map((a) => (
              <button key={a || "all"} onClick={() => setArea(a)} className={clsx("transition", area === a ? "text-black underline decoration-[var(--c)] decoration-2 underline-offset-[6px]" : "text-black/45 hover:text-black")}>
                {a || "Todas"}
                <sup className="mono ml-0.5 text-[10px]">{pad(a ? jobs.filter((j) => j.area === a).length : jobs.length)}</sup>
              </button>
            ))}
          </div>
        )}

        <ul className="mt-8 border-t border-black">
          {shown.map((j) => (
            <li key={j.id} className="border-b border-black/15">
              <button
                onClick={() => apply(j.id)}
                className="group grid w-full grid-cols-[2.5rem_1fr_auto] items-center gap-x-4 gap-y-1 px-1 py-5 text-left transition-colors duration-200 hover:bg-[#111] hover:text-[#f3f1ec] md:grid-cols-[3.5rem_1.6fr_1fr_1fr_auto] md:px-3 md:py-6"
              >
                <span className="mono text-xs text-black/40 group-hover:text-[var(--c)]">{pad(jobs.indexOf(j) + 1)}</span>
                <span className="text-xl font-medium tracking-tight md:text-2xl">{j.title}</span>
                <ArrowUpRight className="size-5 transition-transform duration-200 group-hover:rotate-45 md:order-last" />
                <span className="col-start-2 text-sm text-black/55 group-hover:text-white/60 md:col-start-auto">
                  {[j.area, j.level].filter(Boolean).join(" · ")}
                </span>
                <span className="mono col-start-2 text-sm md:col-start-auto">{j.salary || "A combinar"}</span>
              </button>
            </li>
          ))}
          {!shown.length && <li className="py-8 text-black/50">Nada encontrado.</li>}
        </ul>
        {!jobs.length && open && (
          <button onClick={() => apply("")} className="mt-8 bg-[#111] px-6 py-4 font-medium text-white hover:bg-[var(--c)]">
            {page.cta} →
          </button>
        )}
      </section>

      {/* Como funciona */}
      <section className="border-t border-black/15 px-5 py-14 md:px-10 md:py-20">
        <h2 className="text-4xl font-semibold tracking-[-0.03em] md:text-5xl">Como funciona</h2>
        <ol className="mt-10 grid gap-10 md:grid-cols-3 md:gap-0">
          {[
            ["Escolha a vaga", "Toque na vaga e preencha nome, WhatsApp e e-mail. Leva menos de um minuto."],
            ["Confirme o número", "Chega um código no seu WhatsApp na hora. Digite no site e está confirmado."],
            ["Siga o processo", "As próximas etapas, entrevista e resultado chegam pelo WhatsApp."],
          ].map(([t, d], i) => (
            <li key={t} className="md:border-l md:border-black/15 md:px-8 md:first:border-l-0 md:first:pl-0">
              <span className="text-6xl font-semibold tracking-tighter text-[var(--c)]">{i + 1}</span>
              <h3 className="mt-4 text-lg font-semibold">{t}</h3>
              <p className="mt-1.5 leading-relaxed text-black/60">{d}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Sobre */}
      {(page.about || page.benefits.length > 0 || page.requirements.length > 0) && (
        <section className="grid gap-12 border-t border-black/15 px-5 py-14 md:grid-cols-[1.4fr_1fr_1fr] md:px-10 md:py-20">
          {page.about && (
            <div>
              <h2 className="mono text-xs uppercase tracking-wider text-black/45">Sobre nós</h2>
              <p className="mt-4 whitespace-pre-line text-xl leading-snug tracking-tight md:text-2xl">{page.about}</p>
            </div>
          )}
          {page.benefits.length > 0 && <Plain title="O que oferecemos" items={page.benefits} />}
          {page.requirements.length > 0 && <Plain title="Para todas as vagas" items={page.requirements} />}
        </section>
      )}

      {/* Chamada final */}
      {open && (
        <section className="bg-[var(--c)] px-5 py-16 text-white md:px-10 md:py-24">
          <button onClick={() => apply(jobs.length === 1 ? jobs[0].id : "")} className="group flex w-full items-end justify-between gap-6 text-left">
            <span className="text-5xl font-semibold leading-[0.95] tracking-[-0.04em] md:text-8xl">
              {page.cta}
            </span>
            <ArrowUpRight className="size-12 shrink-0 transition-transform group-hover:rotate-45 md:size-20" strokeWidth={1.5} />
          </button>
        </section>
      )}

      <footer className="overflow-hidden px-5 pt-10 md:px-10">
        <div className="mono flex flex-wrap justify-between gap-3 text-xs text-black/50">
          <span>
            © {new Date().getFullYear()} {page.company}
          </span>
          <a href={privacyHref} className="hover:text-black">
            Política de privacidade
          </a>
        </div>
        <div aria-hidden className="mt-6 select-none whitespace-nowrap text-[22vw] font-semibold leading-[0.75] tracking-[-0.06em] text-black/[.06]">
          {page.company}
        </div>
      </footer>

      {/* Painel lateral: vaga + inscrição */}
      {panel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40" onClick={() => setPanel(null)}>
          <aside onClick={(e) => e.stopPropagation()} className="panel mt-auto flex max-h-[94vh] w-full flex-col overflow-y-auto bg-[#f3f1ec] md:mt-0 md:max-h-none md:w-[520px]">
            <div className="flex items-center justify-between border-b border-black/10 px-6 py-4">
              <span className="mono text-xs uppercase tracking-wider text-black/50">{active ? `Vaga ${pad(jobs.indexOf(active) + 1)}` : "Inscrição"}</span>
              <button onClick={() => setPanel(null)} className="-mr-2 p-2 hover:text-[var(--c)]" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <div className="px-6 py-6">
              <h2 className="text-3xl font-semibold leading-tight tracking-[-0.03em]">{active?.title ?? page.jobTitle}</h2>
              {active && (
                <>
                  <p className="mono mt-3 text-sm text-black/60">{[active.area, active.level, active.salary].filter(Boolean).join(" / ")}</p>
                  {active.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-black/75">{active.description}</p>}
                  {active.requirements.length > 0 && (
                    <ul className="mt-5 space-y-1.5 text-black/75">
                      {active.requirements.map((r) => (
                        <li key={r} className="flex gap-3">
                          <span className="text-[var(--c)]">—</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
            <div className="mt-auto border-t border-black/10 bg-white px-6 py-6">
              {open ? (
                <Signup funnelKey={funnelKey} cta="Enviar inscrição" jobTitle={page.jobTitle} utm={utm} privacyHref={privacyHref} jobs={jobs} job={selected} onJob={setSelected} />
              ) : (
                <p className="py-4 text-black/60">As inscrições estão encerradas no momento.</p>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function Plain({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="mono text-xs uppercase tracking-wider text-black/45">{title}</h2>
      <ul className="mt-4 divide-y divide-black/10 border-y border-black/10">
        {items.map((b) => (
          <li key={b} className="py-2.5">
            {b}
          </li>
        ))}
      </ul>
    </div>
  );
}
