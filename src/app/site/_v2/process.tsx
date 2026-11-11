"use client";

// Processo em três etapas: troca sozinha a cada poucos segundos (para quando a pessoa clica) e tem transição suave.
import { useEffect, useState } from "react";
import { ClipboardList, FileCheck2, Send } from "lucide-react";

const STEPS = [
  {
    icon: ClipboardList,
    title: "Você envia a lista e a mensagem",
    text: "Pelo WhatsApp mesmo: a planilha ou a lista de contatos e o que você quer falar. Se precisar, a gente ajuda a escrever.",
    points: ["Planilha, CSV ou lista colada", "Texto, imagem e botão com link", "Escolha do pacote pelo volume"],
  },
  {
    icon: FileCheck2,
    title: "A gente organiza a operação",
    text: "Higienizamos a lista, montamos a mensagem no padrão da Meta e preparamos as contas e os números que vão disparar.",
    points: ["Tira repetidos, inválidos e quem pediu para sair", "Mensagem aprovada pela Meta", "Disparo único ou fluxo de conversa"],
  },
  {
    icon: Send,
    title: "Disparamos e você acompanha",
    text: "A nossa equipe faz o disparo pela API oficial do WhatsApp e você recebe um relatório que atualiza ao vivo.",
    points: ["Enviadas, entregues, lidas e cliques", "Quem respondeu, com nome e número", "Valor final calculado pelo relatório"],
  },
];

export function Process() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((v) => (v + 1) % STEPS.length), 5200);
    return () => clearInterval(id);
  }, [auto]);
  const s = STEPS[i];

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <div role="tablist" aria-label="Etapas do disparo" className="flex flex-col gap-2">
        {STEPS.map((st, k) => (
          <button
            key={st.title}
            role="tab"
            aria-selected={k === i}
            onClick={() => (setI(k), setAuto(false))}
            className={`group relative overflow-hidden rounded-2xl border px-5 py-4 text-left transition-colors duration-300 ${k === i ? "border-white/15 bg-white/[0.06]" : "border-transparent hover:bg-white/[0.03]"}`}
          >
            <div className="flex items-center gap-4">
              <span className={`grid size-10 shrink-0 place-items-center rounded-xl text-sm font-semibold transition-colors duration-300 ${k === i ? "bg-gradient-to-br from-[#ff7a00] to-[#ff303d] text-white" : "bg-white/5 text-[var(--gray)]"}`}>
                0{k + 1}
              </span>
              <span className={`text-[15px] font-medium transition-colors ${k === i ? "text-white" : "text-[var(--gray)] group-hover:text-white/80"}`}>{st.title}</span>
            </div>
            {/* Barra do tempo da etapa */}
            {k === i && auto && <span key={i} className="absolute inset-x-0 bottom-0 h-px origin-left bg-gradient-to-r from-[#ff6a00] to-[#ff303d] motion-safe:animate-[v2-bar_5.2s_linear]" />}
          </button>
        ))}
      </div>
      <div className="surface relative min-h-[300px] p-7 sm:p-9" aria-live="polite">
        <div key={i} className="motion-safe:animate-[v2-in_.6s_cubic-bezier(.2,.7,.2,1)]">
          <s.icon className="size-7 text-[var(--orange)]" strokeWidth={1.6} />
          <h3 className="t-title mt-5 text-2xl sm:text-3xl">{s.title}</h3>
          <p className="t-muted mt-3 max-w-lg leading-relaxed">{s.text}</p>
          <ul className="mt-6 space-y-2.5">
            {s.points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-[15px] text-white/85">
                <span className="size-1.5 rounded-full bg-[var(--orange)]" /> {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <style>{`@keyframes v2-bar{from{transform:scaleX(0)}to{transform:scaleX(1)}}@keyframes v2-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}`}</style>
    </div>
  );
}
