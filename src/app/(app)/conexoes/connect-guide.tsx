import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

const steps: Array<{ title: string; body: ReactNode }> = [
  {
    title: "Escolha o tipo",
    body: (
      <>
        Em <b className="font-semibold text-zinc-900">Nova conexão</b>, clique em <b className="font-semibold text-zinc-900">Conectar Cloud API</b> (número novo ou dedicado à API) ou em{" "}
        <b className="font-semibold text-zinc-900">Conectar em Coexistência</b> (número que já usa o WhatsApp Business no celular).
      </>
    ),
  },
  {
    title: "Entre com o Facebook da BM",
    body: <>Vai abrir a janela da Meta. Entre com o Facebook que é administrador da BM.</>,
  },
  {
    title: "Escolha a BM, a conta e o número",
    body: <>Escolha a BM, a conta do WhatsApp e o número, e siga as telas até o fim.</>,
  },
  {
    title: "Clique em Concluir",
    body: <>Quando aparecer a tela de conclusão da Meta, clique em Concluir. A janela da Meta fecha sozinha.</>,
  },
  {
    title: "Espere a comemoração",
    body: (
      <>
        Não feche a página. Enquanto o Fuzil conecta, aparece a tela <b className="font-semibold text-zinc-900">Conectando sua BM...</b>. Só está conectada quando
        aparecer <b className="font-semibold text-zinc-900">&quot;BM conectada! 🎉&quot;</b> com o confete.
      </>
    ),
  },
];

/** Passo a passo do botão de conexão (Cloud API / Coexistência), para o cliente seguir sem ID nem token */
export function ConnectGuide({ open }: { open: boolean }) {
  return (
    <details data-tour="connect-guide" open={open} className="group mb-4 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 bg-gradient-to-r from-orange-50 to-white px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-md shadow-orange-500/30">?</span>
        <span className="flex-1">
          <span className="block font-semibold text-zinc-900">Como conectar sua BM pelo botão</span>
          <span className="block text-xs text-zinc-600">Sem ID e sem token: a própria Meta pergunta a BM e o número. Leva uns 2 minutos.</span>
        </span>
        <ChevronRight className="size-4 text-orange-500 transition-transform group-open:rotate-90" />
      </summary>
      <ol className="grid gap-3 border-t border-orange-100 p-5 md:grid-cols-2">
        {steps.map((s, i) => (
          <li key={s.title} className="flex gap-3 rounded-xl bg-zinc-50 p-3.5 ring-1 ring-zinc-200/70">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">{i + 1}</span>
            <div className="min-w-0 text-sm leading-relaxed text-zinc-600">
              <div className="mb-0.5 font-semibold text-zinc-900">{s.title}</div>
              {s.body}
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}
