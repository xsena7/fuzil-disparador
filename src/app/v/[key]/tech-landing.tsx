"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRight, ArrowUpRight, CheckCheck, Clock, Copy, GraduationCap, HeartHandshake, Home, Laptop, Plus, Wallet, X } from "lucide-react";
import { jobPositions, type FunnelPage, type Job } from "@/lib/funnel-types";
import { Signup } from "./signup";

type Props = { page: FunnelPage; jobs: Job[]; funnelKey: string; utm: Record<string, string>; privacyHref: string; open: boolean };

const pad = (n: number) => String(n).padStart(2, "0");
const AREA_COLORS = ["#2b4bff", "#ff6a3d", "#0f9f77", "#b23cd6", "#e0a100", "#0891b2"];
const BENEFIT_ICONS = [Home, GraduationCap, Laptop, Clock, Wallet, HeartHandshake];

function useAreaColor(jobs: Job[]) {
  return useMemo(() => {
    const areas = [...new Set(jobs.map((j) => j.area || "Geral"))];
    return (a: string) => AREA_COLORS[Math.max(0, areas.indexOf(a || "Geral")) % AREA_COLORS.length];
  }, [jobs]);
}

/** Hora de Brasília no topo. */
function Clock24() {
  const [now, setNow] = useState("");
  useEffect(() => {
    const tick = () => setNow(new Date().toLocaleTimeString("pt-BR", { timeZone: "America/Sao_Paulo", hour: "2-digit", minute: "2-digit" }));
    tick();
    const t = setInterval(tick, 10_000);
    return () => clearInterval(t);
  }, []);
  return <span className="tabular-nums">{now || "--:--"}</span>;
}

/** Celular mostrando a conversa que a pessoa vai receber (as mensagens vão aparecendo em loop). */
function Phone({ company, job, avatar }: { company: string; job: string; avatar?: string }) {
  const msgs = [
    { me: false, text: <>Seu código de confirmação é <b>482 913</b>. Não compartilhe com ninguém.</>, button: "Copiar código", icon: Copy },
    { me: false, text: <>Olá, Ana! Sua inscrição para a vaga de <b>{job}</b> foi confirmada ✅</>, button: "Recebi" },
    { me: true, text: <>Recebi</> },
    { me: false, text: <>Perfeito, Ana! Fique de olho por aqui, em breve enviamos a próxima etapa 😉</> },
  ];
  const [n, setN] = useState(0);
  const [typing, setTyping] = useState(true);
  useEffect(() => {
    const done = n >= msgs.length;
    const t = setTimeout(
      () => {
        if (done) {
          setN(0);
          setTyping(true);
        } else if (typing && !msgs[n].me) setTyping(false);
        else {
          setN(n + 1);
          setTyping(true);
        }
      },
      done ? 3500 : typing && !msgs[n]?.me ? 1100 : 900,
    );
    return () => clearTimeout(t);
  }, [n, typing, msgs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative mx-auto w-[290px] rotate-[2deg] rounded-[44px] bg-[#1b1b1f] p-2.5 shadow-[0_40px_80px_-20px_rgba(0,0,0,.6),inset_0_0_0_1px_rgba(255,255,255,.08)] md:w-[310px]">
      <div className="overflow-hidden rounded-[36px] bg-[#efe7dd]">
        <div className="flex items-center gap-2.5 bg-[#1f2c33] px-4 pb-3 pt-7 text-white">
          {avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={avatar} alt="" className="size-8 rounded-full object-cover" />
          ) : (
            <span className="flex size-8 items-center justify-center rounded-full bg-[var(--c)] text-sm font-bold">{company.charAt(0)}</span>
          )}
          <span className="leading-tight">
            <span className="block text-sm font-semibold">{company}</span>
            <span className="block text-[11px] text-white/60">{typing && n < msgs.length && !msgs[n]?.me ? "digitando..." : "online"}</span>
          </span>
        </div>
        <div className="flex h-[400px] flex-col justify-end gap-2 p-3 md:h-[430px]">
          {msgs.slice(0, n).map((m, i) => (
            <div key={i} className={clsx("max-w-[85%] animate-[pop_.25s_ease-out_both]", m.me ? "self-end" : "self-start")}>
              <div className={clsx("rounded-lg px-3 py-2 text-[13px] leading-snug text-[#111] shadow-sm", m.me ? "rounded-tr-none bg-[#d9fdd3]" : "rounded-tl-none bg-white")}>
                {m.text}
                <span className="ml-2 inline-flex translate-y-0.5 items-center gap-0.5 text-[10px] text-black/40">
                  14:0{i + 2} {m.me && <CheckCheck className="size-3 text-sky-500" />}
                </span>
              </div>
              {m.button && (
                <div className="mt-0.5 flex items-center justify-center gap-1.5 rounded-lg bg-white py-2 text-[13px] font-medium text-sky-600 shadow-sm">
                  {m.icon && <m.icon className="size-3.5" />} {m.button}
                </div>
              )}
            </div>
          ))}
          {typing && n < msgs.length && !msgs[n].me && (
            <div className="flex w-14 items-center justify-center gap-1 self-start rounded-lg rounded-tl-none bg-white px-3 py-3 shadow-sm">
              {[0, 1, 2].map((d) => (
                <span key={d} className="size-1.5 animate-bounce rounded-full bg-black/30" style={{ animationDelay: `${d * 0.15}s` }} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const FAQ = [
  ["Preciso ter experiência?", "Não em todas. As vagas marcadas como \"Sem experiência\" têm treinamento pago antes de começar."],
  ["Tem algum custo para participar?", "Nenhum. Nunca pedimos pagamento, Pix ou dados bancários em nenhuma etapa do processo."],
  ["Como funciona o processo?", "Você se inscreve, confirma o WhatsApp com o código, completa um cadastro rápido e, se for selecionado, faz uma entrevista online."],
  ["Quando recebo uma resposta?", "Tudo acontece pelo WhatsApp que você confirmou. Fique de olho nas mensagens nos próximos dias."],
];

export function TechLanding({ page, jobs, funnelKey, utm, privacyHref, open }: Props) {
  const areas = useMemo(() => [...new Set(jobs.map((j) => j.area).filter(Boolean))], [jobs]);
  const color = useAreaColor(jobs);
  const [area, setArea] = useState("");
  const [panel, setPanel] = useState<string | null>(null);
  const [selected, setSelected] = useState("");
  const [faq, setFaq] = useState<number | null>(0);
  const shown = jobs.filter((j) => !area || j.area === area);
  const active = jobs.find((j) => j.id === panel);
  // Total de vagas = soma das posições de cada cargo
  const total = jobs.reduce((n, j) => n + jobPositions(j), 0).toLocaleString("pt-BR");
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
      className="min-h-screen bg-[#f5f4f0] text-[#111] antialiased selection:bg-[var(--c)] selection:text-white"
    >
      <style>{`
        @keyframes ticker { to { transform: translateX(-50%) } }
        @keyframes slidein { from { transform: translateX(100%) } to { transform: none } }
        @keyframes up { from { transform: translateY(100%) } to { transform: none } }
        @keyframes draw { from { stroke-dashoffset: 400 } to { stroke-dashoffset: 0 } }
        @keyframes pop { from { opacity: 0; transform: translateY(6px) scale(.97) } to { opacity: 1; transform: none } }
        @keyframes fadeup { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
        .panel { animation: up .35s cubic-bezier(.16,1,.3,1) both }
        @media (min-width: 768px) { .panel { animation-name: slidein } }
        .mono { font-family: ui-monospace, "SF Mono", "JetBrains Mono", Menlo, monospace }
        .fu { animation: fadeup .7s cubic-bezier(.16,1,.3,1) both }
        .grain { background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E") }
      `}</style>

      {/* Topo escuro */}
      <div className="relative overflow-hidden bg-[#0e0e10] text-[#f5f4f0]">
        <div aria-hidden className="grain pointer-events-none absolute inset-0 opacity-[.07] mix-blend-overlay" />
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.05)_1px,transparent_1px)] bg-[size:calc(100%/6)_100%]" />
        <div className="mono relative flex items-center justify-between border-b border-white/10 px-5 py-2.5 text-[11px] uppercase tracking-wider text-white/55 md:px-10">
          <span className="flex items-center gap-2">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--c)]" />
              <span className="relative size-1.5 rounded-full bg-[var(--c)]" />
            </span>
            Contratando · {total} vagas
          </span>
          <span>
            Brasília <Clock24 />
          </span>
        </div>
        <nav className="relative flex items-center justify-between px-5 py-5 md:px-10">
          <span className="text-lg font-bold tracking-tight">
            {page.company}
            <span className="text-[var(--c)]">.</span>
          </span>
          <a href="#vagas" className="group flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#111] transition hover:bg-[var(--c)] hover:text-white">
            Ver vagas <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </a>
        </nav>

        <header className="relative grid items-center gap-14 px-5 pb-20 pt-8 md:grid-cols-[1.25fr_1fr] md:px-10 md:pb-24 md:pt-14">
          <div>
            <p className="fu mono text-xs uppercase tracking-[0.2em] text-white/50">{page.location || "Home office · Todo o Brasil"}</p>
            <h1 className="fu mt-5 text-[13vw] font-semibold leading-[0.92] tracking-[-0.045em] md:text-[5.6vw]" style={{ animationDelay: ".05s" }}>
              {words.join(" ")}{" "}
              <span className="relative inline-block whitespace-nowrap">
                {last}
                <svg aria-hidden viewBox="0 0 300 20" preserveAspectRatio="none" className="absolute -bottom-[0.06em] left-0 h-[0.14em] w-full text-[var(--c)]">
                  <path d="M2 14 C 60 4, 140 4, 298 10" fill="none" stroke="currentColor" strokeWidth="7" strokeLinecap="round" strokeDasharray="400" style={{ animation: "draw 1.1s .5s ease-out both" }} />
                </svg>
              </span>
            </h1>
            <p className="fu mt-7 max-w-xl text-lg leading-relaxed text-white/65 md:text-xl" style={{ animationDelay: ".12s" }}>
              {page.subtitle}
            </p>
            <div className="fu mt-9 flex flex-wrap items-center gap-4" style={{ animationDelay: ".2s" }}>
              <a href="#vagas" className="group inline-flex items-center gap-2 rounded-full bg-[var(--c)] px-7 py-4 font-semibold text-white transition hover:brightness-110">
                {page.cta} <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
              </a>
              <span className="text-sm text-white/50">Inscrição em 1 minuto · Sem custo</span>
            </div>
            <dl className="fu mt-14 grid max-w-xl grid-cols-3 border-t border-white/10 pt-6" style={{ animationDelay: ".28s" }}>
              {[
                [total, "vagas abertas"],
                ["100%", "remoto"],
                ["0", "custo para participar"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="text-3xl font-semibold tracking-tight md:text-4xl">{v}</dt>
                  <dd className="mt-1 text-xs text-white/50">{l}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="fu" style={{ animationDelay: ".25s" }}>
            <Phone company={page.company} job={jobs[0]?.title ?? page.jobTitle} avatar={page.avatar} />
          </div>
        </header>

        {jobs.length > 0 && (
          <div className="relative overflow-hidden bg-[var(--c)] py-3 text-white">
            <div className="flex w-max" style={{ animation: "ticker 45s linear infinite" }}>
              {[0, 1].map((k) => (
                <div key={k} className="flex shrink-0">
                  {[...jobs, ...jobs, ...jobs].map((j, i) => (
                    <span key={`${k}${i}`} className="flex items-center gap-6 pr-6 text-sm font-semibold uppercase tracking-wide">
                      {j.title}
                      <span className="text-white/60">✦</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Vagas */}
      <section id="vagas" className="scroll-mt-4 px-5 py-16 md:px-10 md:py-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="mono text-xs uppercase tracking-[0.2em] text-black/45">Vagas abertas · {total}</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] md:text-6xl">Escolha a sua.</h2>
          </div>
          {areas.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {["", ...areas].map((a) => (
                <button
                  key={a || "all"}
                  onClick={() => setArea(a)}
                  className={clsx("rounded-full border px-4 py-2 text-sm font-medium transition", area === a ? "border-[#111] bg-[#111] text-white" : "border-black/15 bg-white hover:border-black/40")}
                >
                  {a && <span className="mr-2 inline-block size-2 rounded-full" style={{ background: color(a) }} />}
                  {a || "Todas"}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          {shown.map((j) => (
            <button
              key={j.id}
              onClick={() => apply(j.id)}
              style={{ "--a": color(j.area) } as React.CSSProperties}
              className="group relative flex flex-col overflow-hidden rounded-2xl border border-black/[.07] bg-white p-6 text-left shadow-[0_1px_2px_rgba(0,0,0,.04)] transition duration-300 hover:-translate-y-1 hover:border-black/15 hover:shadow-[0_24px_48px_-16px_rgba(0,0,0,.18)] md:p-7"
            >
              <span className="absolute inset-x-0 top-0 h-1 origin-left scale-x-0 bg-[var(--a)] transition-transform duration-500 group-hover:scale-x-100" />
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 rounded-full bg-[color-mix(in_srgb,var(--a)_10%,white)] px-3 py-1 text-xs font-semibold text-[var(--a)]">
                  <span className="size-1.5 rounded-full bg-[var(--a)]" />
                  {j.area || "Geral"}
                </span>
                <span className="mono text-xs text-black/35">{pad(jobs.indexOf(j) + 1)}</span>
              </div>
              <h3 className="mt-5 text-2xl font-semibold leading-tight tracking-tight md:text-[1.7rem]">{j.title}</h3>
              {j.description && <p className="mt-2 line-clamp-2 text-[15px] leading-relaxed text-black/55">{j.description}</p>}
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-black/[.07] pt-5 text-sm">
                <span className="flex items-center gap-1.5 text-black/60">
                  <Home className="size-4" /> Remoto
                </span>
                <span className="font-medium">{jobPositions(j).toLocaleString("pt-BR")} vagas</span>
                {j.level && <span className="text-black/60">{j.level}</span>}
                <span className="mono font-medium">{j.salary || "A combinar"}</span>
                <span className="ml-auto flex size-10 items-center justify-center rounded-full bg-[#f5f4f0] transition group-hover:bg-[var(--a)] group-hover:text-white">
                  <ArrowUpRight className="size-5 transition-transform duration-300 group-hover:rotate-45" />
                </span>
              </div>
            </button>
          ))}
        </div>
        {!jobs.length && open && (
          <button onClick={() => apply("")} className="mt-8 rounded-full bg-[#111] px-7 py-4 font-semibold text-white hover:bg-[var(--c)]">
            {page.cta} →
          </button>
        )}
      </section>

      {/* Benefícios */}
      {page.benefits.length > 0 && (
        <section className="px-5 pb-16 md:px-10 md:pb-24">
          <div className="grid gap-px overflow-hidden rounded-2xl border border-black/[.07] bg-black/[.07] sm:grid-cols-2 lg:grid-cols-4">
            {page.benefits.slice(0, 8).map((b, i) => {
              const Icon = BENEFIT_ICONS[i % BENEFIT_ICONS.length];
              return (
                <div key={b} className="group bg-white p-6 transition hover:bg-[#111] hover:text-white">
                  <Icon className="size-6 text-[var(--c)]" strokeWidth={1.75} />
                  <p className="mt-8 text-lg font-semibold leading-tight tracking-tight">{b}</p>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* Como funciona */}
      <section className="bg-white px-5 py-16 md:px-10 md:py-24">
        <div className="grid gap-12 md:grid-cols-[1fr_2fr]">
          <div>
            <p className="mono text-xs uppercase tracking-[0.2em] text-black/45">Processo</p>
            <h2 className="mt-3 text-4xl font-semibold tracking-[-0.03em] md:text-5xl">Simples assim.</h2>
          </div>
          <ol className="grid gap-8 sm:grid-cols-3">
            {[
              ["Escolha a vaga", "Toque na vaga e preencha nome, WhatsApp e e-mail."],
              ["Confirme o número", "O código chega no seu WhatsApp na hora. É só digitar no site."],
              ["Siga o processo", "Cadastro, entrevista e resultado chegam pelo WhatsApp."],
            ].map(([t, d], i) => (
              <li key={t} className="relative">
                <span className="flex size-11 items-center justify-center rounded-full border-2 border-[#111] text-lg font-bold">{i + 1}</span>
                <h3 className="mt-5 text-lg font-semibold">{t}</h3>
                <p className="mt-1.5 leading-relaxed text-black/55">{d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Sobre + FAQ */}
      <section className="grid gap-14 px-5 py-16 md:grid-cols-2 md:px-10 md:py-24">
        <div>
          <p className="mono text-xs uppercase tracking-[0.2em] text-black/45">Sobre a {page.company}</p>
          {page.about && <p className="mt-4 whitespace-pre-line text-2xl leading-snug tracking-tight md:text-3xl">{page.about}</p>}
          {page.requirements.length > 0 && (
            <div className="mt-8 flex flex-wrap gap-2">
              {page.requirements.map((r) => (
                <span key={r} className="rounded-full border border-black/15 bg-white px-4 py-2 text-sm">
                  {r}
                </span>
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mono text-xs uppercase tracking-[0.2em] text-black/45">Perguntas frequentes</p>
          <div className="mt-4 divide-y divide-black/10 border-y border-black/10">
            {FAQ.map(([q, a], i) => (
              <div key={q}>
                <button onClick={() => setFaq(faq === i ? null : i)} className="flex w-full items-center justify-between gap-4 py-5 text-left text-lg font-medium">
                  {q}
                  <Plus className={clsx("size-5 shrink-0 transition-transform duration-300", faq === i && "rotate-45")} />
                </button>
                <div className={clsx("grid transition-all duration-300", faq === i ? "grid-rows-[1fr] pb-5 opacity-100" : "grid-rows-[0fr] opacity-0")}>
                  <p className="overflow-hidden leading-relaxed text-black/60">{a}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Chamada final */}
      {open && (
        <section className="px-5 pb-16 md:px-10">
          <button
            onClick={() => apply(jobs.length === 1 ? jobs[0].id : "")}
            className="group relative flex w-full items-end justify-between gap-6 overflow-hidden rounded-3xl bg-[#111] px-7 py-12 text-left text-white md:px-12 md:py-16"
          >
            <span className="absolute inset-0 origin-bottom scale-y-0 bg-[var(--c)] transition-transform duration-500 ease-out group-hover:scale-y-100" />
            <span className="relative text-4xl font-semibold leading-[0.95] tracking-[-0.04em] md:text-7xl">
              Sua próxima vaga
              <br />
              começa aqui.
            </span>
            <span className="relative flex size-14 shrink-0 items-center justify-center rounded-full bg-white text-[#111] transition-transform duration-300 group-hover:rotate-45 md:size-20">
              <ArrowUpRight className="size-7 md:size-9" />
            </span>
          </button>
        </section>
      )}

      <footer className="overflow-hidden px-5 pt-4 md:px-10">
        <div className="mono flex flex-wrap justify-between gap-3 text-xs text-black/50">
          <span>
            © {new Date().getFullYear()} {page.company} · Todos os direitos reservados
          </span>
          <a href={privacyHref} className="hover:text-black">
            Política de privacidade
          </a>
        </div>
        <div aria-hidden className="mt-6 select-none whitespace-nowrap text-[20vw] font-semibold leading-[0.75] tracking-[-0.06em] text-black/[.05]">
          {page.company}
        </div>
      </footer>

      {/* Painel lateral: vaga + inscrição */}
      {panel && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]" onClick={() => setPanel(null)}>
          <aside onClick={(e) => e.stopPropagation()} className="panel mt-auto flex max-h-[94vh] w-full flex-col overflow-y-auto rounded-t-3xl bg-[#f5f4f0] md:mt-0 md:max-h-none md:w-[520px] md:rounded-none">
            <div className="flex items-center justify-between px-6 py-4">
              {active ? (
                <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold" style={{ color: color(active.area) }}>
                  <span className="size-1.5 rounded-full" style={{ background: color(active.area) }} /> {active.area || "Geral"}
                </span>
              ) : (
                <span className="mono text-xs uppercase tracking-wider text-black/50">Inscrição</span>
              )}
              <button onClick={() => setPanel(null)} className="-mr-2 flex size-9 items-center justify-center rounded-full hover:bg-black/5" aria-label="Fechar">
                <X className="size-5" />
              </button>
            </div>
            <div className="px-6 pb-6">
              <h2 className="text-3xl font-semibold leading-tight tracking-[-0.03em]">{active?.title ?? page.jobTitle}</h2>
              {active && (
                <>
                  <div className="mt-3 flex flex-wrap gap-2 text-sm">
                    <span className="rounded-full bg-white px-3 py-1">Remoto</span>
                    {active.level && <span className="rounded-full bg-white px-3 py-1">{active.level}</span>}
                    {active.salary && <span className="mono rounded-full bg-white px-3 py-1">{active.salary}</span>}
                  </div>
                  {active.description && <p className="mt-5 whitespace-pre-line leading-relaxed text-black/70">{active.description}</p>}
                  {active.requirements.length > 0 && (
                    <ul className="mt-5 space-y-2 text-black/75">
                      {active.requirements.map((r) => (
                        <li key={r} className="flex gap-3">
                          <span style={{ color: color(active.area) }}>●</span>
                          {r}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>
            <div className="mt-auto rounded-t-3xl bg-white px-6 py-7 shadow-[0_-10px_30px_-20px_rgba(0,0,0,.25)]">
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
