"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Rocket, Sparkles, X } from "lucide-react";
import { setTourStateAction } from "@/app/actions/tour";

type Step = {
  /** Tela do passo (o tour leva o usuário até ela) */
  path?: string;
  /** Elemento destacado: [data-tour="..."]. Sem ele (ou se não estiver na tela), o cartão aparece no meio */
  target?: string;
  title: string;
  body: ReactNode;
};

const STEPS: Step[] = [
  {
    path: "/",
    target: "nav-conexoes",
    title: "1. Conecte sua BM",
    body: "Tudo começa em Conexões. É aqui que você liga a BM do WhatsApp ao Fuzil.",
  },
  {
    path: "/conexoes",
    target: "connect-guide",
    title: "Libere o app do Fuzil na sua BM",
    body: (
      <>
        Siga esses passos na Meta (abre em outra aba). Depois de pedir o acesso ao app, chame a gente no <b>WhatsApp</b> pelo botão verde para aprovar
        rapidinho.
      </>
    ),
  },
  {
    path: "/conexoes",
    target: "connect-form",
    title: "Cole o token",
    body: "Cole o token gerado e clique em Conectar. O Fuzil acha sozinho as contas do WhatsApp pelo token, confere tudo na Meta e já puxa seus números.",
  },
  {
    path: "/conexoes",
    target: "connections",
    title: "Sua BM aparece aqui",
    body: "Bolinha verde = pronta para disparar. Se faltar algo (cartão, template, número), o Fuzil mostra o que falta dentro da gaveta da BM.",
  },
  {
    path: "/grupos",
    target: "new-group",
    title: "2. Monte um grupo",
    body: "Crie um grupo e marque suas BMs. Na campanha você escolhe o grupo e o Fuzil divide os envios entre todos os números dele.",
  },
  {
    path: "/templates-padrao",
    target: "page-header",
    title: "3. Template aprovado",
    body: (
      <>
        Ao conectar, o Fuzil já manda o template padrão <b>fuzil_utilidade1</b> para a Meta aprovar, sozinho. Espere ficar <b>Aprovado</b> (costuma levar
        poucos minutos). Se quiser, crie os seus em Templates.
      </>
    ),
  },
  {
    path: "/saldo",
    target: "page-header",
    title: "4. Saldo",
    body: "Cada mensagem enviada usa crédito. Confira aqui se tem saldo antes de disparar.",
  },
  {
    path: "/campanhas/nova",
    target: "new-campaign",
    title: "5. Crie a campanha",
    body: "Dê um nome, deixe marcado Grupo de BMs e clique em Continuar.",
  },
  {
    target: "campaign-steps",
    title: "6. Monte e dispare 🚀",
    body: (
      <ol className="list-decimal space-y-1 pl-4">
        <li><b>Template</b>: escolha o template aprovado</li>
        <li><b>Audiência</b>: suba a planilha com os números</li>
        <li><b>Conteúdo</b>: ligue as variáveis às colunas e confira o preview</li>
        <li><b>Envio</b>: clique em Disparar agora</li>
        <li>Acompanhe em <b>Métricas</b> e mande o <b>Relatório do cliente</b></li>
      </ol>
    ),
  },
];

const KEY = "fuzil-tour-step";
const START = "fuzil:tour-start";

function readStep(): number | null {
  try {
    const v = localStorage.getItem(KEY);
    return v === null ? null : Number(v);
  } catch {
    return null;
  }
}
function writeStep(i: number | null) {
  try {
    if (i === null) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, String(i));
  } catch {
    // sem localStorage o tour continua até recarregar a página
  }
}

/** Botão "Fazer o tour" (em Tutoriais): começa do primeiro passo */
export function StartTourButton({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <button type="button" className={className} onClick={() => window.dispatchEvent(new Event(START))}>
      {children}
    </button>
  );
}

type Rect = { top: number; left: number; width: number; height: number };
const PAD = 8;

export function Tour({ offer }: { offer: boolean }) {
  const router = useRouter();
  const path = usePathname();
  const [step, setStep] = useState<number | null>(null);
  const [invite, setInvite] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);
  const [vw, setVw] = useState({ w: 1200, h: 800 });
  const scrolled = useRef<string | null>(null);

  useEffect(() => {
    const saved = readStep();
    if (saved !== null && STEPS[saved]) setStep(saved);
    else if (offer) setInvite(true);
    const start = () => {
      setInvite(false);
      go(0);
    };
    window.addEventListener(START, start);
    return () => window.removeEventListener(START, start);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const go = useCallback(
    (i: number) => {
      const s = STEPS[i];
      if (!s) return;
      writeStep(i);
      setRect(null);
      scrolled.current = null;
      setStep(i);
      if (s.path && s.path !== window.location.pathname) router.push(s.path);
    },
    [router],
  );

  const end = useCallback((state: "DONE" | "SKIPPED") => {
    writeStep(null);
    setStep(null);
    setInvite(false);
    setTourStateAction(state).catch(() => undefined);
  }, []);

  // Acompanha o elemento destacado (espera a tela carregar e segue a rolagem)
  useEffect(() => {
    if (step === null) return;
    const s = STEPS[step];
    const measure = () => {
      setVw({ w: window.innerWidth, h: window.innerHeight });
      const el = s.target ? document.querySelector<HTMLElement>(`[data-tour="${s.target}"]`) : null;
      const r = el?.getBoundingClientRect();
      if (!el || !r || r.width === 0 || r.height === 0) return setRect(null);
      const key = `${step}:${s.target}`;
      if (scrolled.current !== key) {
        scrolled.current = key;
        // Gaveta destacada abre sozinha para mostrar o conteúdo
        const d = el.matches("details") ? el : el.querySelector(":scope > details");
        // (depois de um instante, para não mexer na tela antes do React terminar de carregá-la)
        if (d instanceof HTMLDetailsElement) setTimeout(() => (d.open = true), 600);
        if (r.top < 70 || r.bottom > window.innerHeight - 40) el.scrollIntoView({ block: r.height > window.innerHeight * 0.6 ? "start" : "center", behavior: "smooth" });
      }
      setRect((old) =>
        old && Math.abs(old.top - r.top) < 0.5 && Math.abs(old.left - r.left) < 0.5 && Math.abs(old.width - r.width) < 0.5 && Math.abs(old.height - r.height) < 0.5
          ? old
          : { top: r.top, left: r.left, width: r.width, height: r.height },
      );
    };
    measure();
    const t = setInterval(measure, 120);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      clearInterval(t);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [step, path]);

  useEffect(() => {
    if (step === null) return;
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable]");
      if (e.key === "Escape") end("SKIPPED");
      else if (!typing && e.key === "ArrowRight") step < STEPS.length - 1 ? go(step + 1) : end("DONE");
      else if (!typing && e.key === "ArrowLeft" && step > 0) go(step - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step, go, end]);

  if (invite) {
    return (
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-zinc-950/60 p-4" style={{ animation: "dialog-fade .2s ease-out" }}>
        <div className="relative w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-2xl" style={{ animation: "dialog-pop .25s ease-out" }}>
          <div className="relative overflow-hidden bg-ink px-6 pb-6 pt-7 text-white">
            <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-orange-500/30" style={{ filter: "blur(40px)" }} />
            <span className="relative mb-3 inline-flex size-11 items-center justify-center rounded-2xl bg-brand-gradient shadow-lg shadow-orange-500/30">
              <Sparkles className="size-5" />
            </span>
            <h2 className="relative text-xl font-semibold">Bem-vindo ao Fuzil! 👋</h2>
            <p className="relative mt-1.5 text-sm text-zinc-300">Quer um tour rápido? Em 2 minutos a gente te mostra do zero até o primeiro disparo.</p>
          </div>
          <ol className="space-y-2 px-6 py-5 text-sm text-zinc-700">
            {["Conectar sua BM", "Montar o grupo de BMs", "Template aprovado e saldo", "Criar a campanha e disparar"].map((t, i) => (
              <li key={t} className="flex items-center gap-3">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-zinc-100 px-6 py-4">
            <span className="mr-auto text-xs text-zinc-400">Dá para refazer depois em Tutoriais</span>
            <button onClick={() => end("SKIPPED")} className="rounded-xl px-3 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-100">Agora não</button>
            <button
              onClick={() => {
                setInvite(false);
                go(0);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-md shadow-orange-500/30 hover:brightness-110"
            >
              <Rocket className="size-4" /> Bora fazer o tour
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === null) return null;
  const s = STEPS[step];
  const last = step === STEPS.length - 1;
  const cardW = Math.min(380, vw.w - 32);

  // Onde o cartão fica: ao lado (menu), embaixo, em cima ou no canto (elemento grande)
  let pos: React.CSSProperties;
  if (!rect) pos = { left: "50%", top: "50%", transform: "translate(-50%, -50%)" };
  else if (vw.w < 640) pos = { left: 16, right: 16, bottom: 16 };
  else if (rect.left + rect.width < 300) pos = { left: rect.left + rect.width + PAD + 14, top: Math.max(16, Math.min(rect.top - 10, vw.h - 300)) };
  else {
    const left = Math.max(16, Math.min(rect.left, vw.w - cardW - 16));
    if (vw.h - (rect.top + rect.height) > 280) pos = { left, top: rect.top + rect.height + PAD + 12 };
    else if (rect.top > 280) pos = { left, bottom: vw.h - rect.top + PAD + 12 };
    else pos = { right: 24, bottom: 24 };
  }

  return (
    <>
      {rect ? (
        <div
          aria-hidden
          className="pointer-events-none fixed z-[60] rounded-2xl ring-2 ring-orange-400 transition-all duration-300 ease-out"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            boxShadow: "0 0 0 9999px rgba(12,12,16,.62), 0 0 0 6px rgba(251,146,60,.25), 0 0 32px 4px rgba(251,146,60,.45)",
          }}
        />
      ) : (
        <div aria-hidden className="pointer-events-none fixed inset-0 z-[60] bg-zinc-950/60" />
      )}
      <div
        key={step}
        role="dialog"
        aria-label={s.title}
        className="fixed z-[61] overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/5"
        style={{ width: vw.w < 640 ? undefined : cardW, animation: "dialog-pop .25s ease-out", ...pos }}
      >
        <div className="h-1 bg-zinc-100">
          <div className="h-full bg-brand-gradient transition-all duration-300" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
        <div className="p-5">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-orange-600">Passo {step + 1} de {STEPS.length}</span>
            <button onClick={() => end("SKIPPED")} aria-label="Sair do tour" className="-mr-1 rounded-lg p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700">
              <X className="size-4" />
            </button>
          </div>
          <h3 className="text-base font-semibold text-zinc-900">{s.title}</h3>
          <div className="mt-1.5 text-sm leading-relaxed text-zinc-600">{s.body}</div>
          <div className="mt-4 flex items-center gap-2">
            <div className="mr-auto flex gap-1">
              {STEPS.map((_, i) => (
                <button key={i} onClick={() => go(i)} aria-label={`Ir para o passo ${i + 1}`} className={`h-1.5 rounded-full transition-all ${i === step ? "w-5 bg-orange-500" : i < step ? "w-1.5 bg-orange-300" : "w-1.5 bg-zinc-200"}`} />
              ))}
            </div>
            {step > 0 && (
              <button onClick={() => go(step - 1)} className="inline-flex items-center gap-1 rounded-xl px-2.5 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100">
                <ArrowLeft className="size-4" /> Voltar
              </button>
            )}
            <button
              onClick={() => (last ? end("DONE") : go(step + 1))}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-gradient px-3.5 py-1.5 text-sm font-semibold text-white shadow-md shadow-orange-500/30 hover:brightness-110"
            >
              {last ? <>Concluir <Rocket className="size-4" /></> : <>Próximo <ArrowRight className="size-4" /></>}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
