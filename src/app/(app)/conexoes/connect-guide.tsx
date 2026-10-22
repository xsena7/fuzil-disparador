"use client";

import { useState, type ReactNode } from "react";
import { Check, ChevronRight, Copy, ExternalLink, MessageCircle } from "lucide-react";
import { toast } from "@/components/toast";

function CopyChip({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setDone(true);
        toast("success", `${label} copiado!`);
        setTimeout(() => setDone(false), 1800);
      }}
      className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-900 px-2.5 py-1 font-mono text-xs font-semibold text-white hover:bg-zinc-700"
    >
      {value} {done ? <Check className="size-3.5 text-emerald-400" /> : <Copy className="size-3.5 opacity-70" />}
    </button>
  );
}

const Path = ({ children }: { children: ReactNode }) => <b className="font-semibold text-zinc-900">{children}</b>;

/** Passo a passo para o cliente liberar o app do Fuzil na BM dele e gerar o token */
export function ConnectGuide({ appId, whatsappUrl, open, admin }: { appId: string; whatsappUrl: string; open: boolean; admin: boolean }) {
  const steps: Array<{ title: string; body: ReactNode }> = [
    {
      title: "Peça acesso ao app do Fuzil",
      body: (
        <>
          Na sua BM: <Path>Configurações do negócio → Contas → Apps → Adicionar → Solicitar acesso a um ID do app</Path>. Cole o ID{" "}
          <CopyChip value={appId} label="ID do app" /> e envie.
        </>
      ),
    },
    {
      title: "Espere a aprovação",
      body: (
        <>
          <span className="block">A gente aprova o pedido do nosso lado. Chama no WhatsApp que é rapidinho:</span>
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-2 inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm shadow-emerald-600/30 hover:bg-emerald-700"
          >
            <MessageCircle className="size-4" /> Pedir aprovação no WhatsApp
          </a>
          {admin && (
            <span className="mt-2 block text-xs text-zinc-500">
              Você (admin) aprova em <Path>Configurações do negócio → Solicitações</Path>, na BM do app do Fuzil.
            </span>
          )}
        </>
      ),
    },
    {
      title: "Crie o usuário do sistema",
      body: (
        <>
          <Path>Usuários → Usuários do sistema → Adicionar</Path>. Nome <CopyChip value="fuzil-api" label="Nome" />, função <Path>Administrador</Path>.
        </>
      ),
    },
    {
      title: "Dê acesso ao usuário",
      body: (
        <>
          No <Path>fuzil-api</Path>, clique em <Path>Atribuir ativos</Path>: em <Path>Apps</Path> marque o app do Fuzil com <Path>Controle total</Path>. Depois, de
          novo em <Path>Atribuir ativos</Path>: em <Path>Contas do WhatsApp</Path> marque a sua conta com <Path>Controle total</Path>.
        </>
      ),
    },
    {
      title: "Gere o token",
      body: (
        <>
          No <Path>fuzil-api</Path>, clique em <Path>Gerar token</Path>, escolha o app do Fuzil, validade <Path>Nunca</Path> e marque{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">whatsapp_business_messaging</code>, <code className="rounded bg-zinc-100 px-1 text-xs">whatsapp_business_management</code> e{" "}
          <code className="rounded bg-zinc-100 px-1 text-xs">business_management</code>. Copie o token (a Meta só mostra uma vez).
        </>
      ),
    },
    {
      title: "Pegue o ID da WABA",
      body: (
        <>
          <Path>Contas → Contas do WhatsApp</Path> e clique na sua conta: o número em <Path>ID</Path> é o ID da WABA.
        </>
      ),
    },
    {
      title: "Cole aqui embaixo e conecte",
      body: "Cole o ID da WABA e o token em Configuração manual e clique em Conectar WABA. Pronto!",
    },
  ];

  return (
    <details data-tour="connect-guide" open={open} className="group mb-4 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
      <summary className="flex cursor-pointer list-none items-center gap-3 bg-gradient-to-r from-orange-50 to-white px-5 py-4 [&::-webkit-details-marker]:hidden">
        <span className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-sm font-bold text-white shadow-md shadow-orange-500/30">?</span>
        <span className="flex-1">
          <span className="block font-semibold text-zinc-900">Como conectar sua BM (passo a passo)</span>
          <span className="block text-xs text-zinc-600">Libera o app do Fuzil na sua BM e gera o token. Leva uns 5 minutos.</span>
        </span>
        <a
          href="https://business.facebook.com/settings"
          target="_blank"
          rel="noreferrer"
          onClick={(e) => e.stopPropagation()}
          className="hidden items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50 sm:inline-flex"
        >
          Abrir a BM na Meta <ExternalLink className="size-3.5" />
        </a>
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
