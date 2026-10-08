"use client";

import { Fragment, type ReactNode } from "react";
import clsx from "clsx";
import { AlertCircle, Check, CheckCheck, Clock, FileText, MapPin, Megaphone, MousePointerClick, Zap } from "lucide-react";

export type ChatMsg = {
  id: string;
  direction: "IN" | "OUT";
  kind: string;
  text: string | null;
  mediaId: string | null;
  mediaUrl: string | null;
  mediaMime: string | null;
  mediaName: string | null;
  status: string | null;
  error: string | null;
  source: "CAMPAIGN" | "AUTO_REPLY" | "AGENT" | "CUSTOMER" | "SYSTEM";
  campaignId: string | null;
  createdAt: string;
};

/** Formatação do WhatsApp (*negrito*, _itálico_, ~riscado~) e links clicáveis, sem HTML cru. */
export function WaText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /(\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s]+)/g;
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) out.push(text.slice(last, m.index));
    const t = m[0];
    if (t.startsWith("http")) out.push(<a key={k++} href={t} target="_blank" rel="noreferrer" className="break-all underline underline-offset-2">{t}</a>);
    else if (t.startsWith("*")) out.push(<b key={k++}>{t.slice(1, -1)}</b>);
    else if (t.startsWith("_")) out.push(<i key={k++}>{t.slice(1, -1)}</i>);
    else out.push(<s key={k++}>{t.slice(1, -1)}</s>);
    last = m.index! + t.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return <span className="whitespace-pre-wrap break-words">{out}</span>;
}

const time = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

function Ticks({ m }: { m: ChatMsg }) {
  if (m.status === "failed") return <span title={m.error ?? "Falhou"}><AlertCircle className="size-3.5 text-rose-500" /></span>;
  if (m.status === "read") return <CheckCheck className="size-3.5 text-sky-500" />;
  if (m.status === "delivered") return <CheckCheck className="size-3.5 opacity-60" />;
  if (m.status === "sent") return <Check className="size-3.5 opacity-60" />;
  return <Clock className="size-3 opacity-60" />;
}

function Media({ m }: { m: ChatMsg }) {
  const src = `/api/chat/media/${m.id}`;
  if (m.kind === "image" || m.kind === "sticker")
    return (
      <a href={src} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="" loading="lazy" className={clsx("rounded-xl object-cover", m.kind === "sticker" ? "size-28 bg-transparent" : "max-h-72 w-full max-w-xs bg-black/5")} />
      </a>
    );
  if (m.kind === "audio") return <audio controls preload="none" src={src} className="h-10 w-64 max-w-full" />;
  if (m.kind === "video") return <video controls preload="metadata" src={src} className="max-h-72 w-full max-w-xs rounded-xl bg-black" />;
  if (m.kind === "document")
    return (
      <a href={src} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-xl bg-black/5 px-3 py-2 text-sm">
        <FileText className="size-5 shrink-0 opacity-70" />
        <span className="truncate">{m.mediaName || "Documento"}</span>
      </a>
    );
  if (m.kind === "location")
    return (
      <span className="flex items-center gap-1.5 text-sm"><MapPin className="size-4" /> Localização</span>
    );
  return null;
}

/** Uma mensagem do chat. Disparos e respostas automáticas ganham um selo próprio. */
export function Bubble({ m, campaignName }: { m: ChatMsg; campaignName?: string }) {
  const out = m.direction === "OUT";
  const agent = out && m.source === "AGENT";
  const hasMedia = ["image", "sticker", "audio", "video", "document", "location"].includes(m.kind);
  return (
    <div className={clsx("flex", out ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "relative max-w-[min(34rem,85%)] rounded-2xl px-3.5 py-2 text-[14px] leading-relaxed shadow-sm",
          !out && "rounded-bl-md bg-white text-zinc-800 ring-1 ring-zinc-200/70",
          agent && "rounded-br-md bg-brand-gradient text-white",
          out && m.source === "CAMPAIGN" && "rounded-br-md bg-orange-50 text-zinc-800 ring-1 ring-orange-200/80",
          out && m.source === "AUTO_REPLY" && "rounded-br-md bg-violet-50 text-zinc-800 ring-1 ring-violet-200/80",
          m.status === "failed" && "ring-2 ring-rose-300",
        )}
      >
        {out && m.source === "CAMPAIGN" && (
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-orange-600">
            <Megaphone className="size-3.5" /> Disparo{campaignName ? ` · ${campaignName}` : ""}
          </div>
        )}
        {out && m.source === "AUTO_REPLY" && (
          <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-600">
            <Zap className="size-3.5" /> Resposta automática
          </div>
        )}
        {out && m.source === "AGENT" && m.kind === "template" && (
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-white/80">Template</div>
        )}
        {hasMedia && <div className={clsx(m.text && "mb-1.5")}><Media m={m} /></div>}
        {m.kind === "reaction" ? <span className="text-2xl">{m.text}</span> : m.text ? <WaText text={m.text} /> : !hasMedia && <span className="italic opacity-60">Mensagem não suportada</span>}
        <div className={clsx("mt-0.5 flex items-center justify-end gap-1 text-[11px]", agent ? "text-white/75" : "text-zinc-400")}>
          {time(m.createdAt)}
          {out && <Ticks m={m} />}
        </div>
        {m.status === "failed" && m.error && <div className={clsx("mt-1 text-[11px]", agent ? "text-white" : "text-rose-600")}>Não enviada: {m.error}</div>}
      </div>
    </div>
  );
}

/** Separador "Hoje", "Ontem", "12/10" entre dias. */
export function DaySeparator({ iso }: { iso: string }) {
  const d = new Date(iso);
  const tz = { timeZone: "America/Sao_Paulo" } as const;
  const key = (x: Date) => x.toLocaleDateString("pt-BR", tz);
  const today = key(new Date());
  const yesterday = key(new Date(Date.now() - 86400_000));
  const label = key(d) === today ? "Hoje" : key(d) === yesterday ? "Ontem" : d.toLocaleDateString("pt-BR", { ...tz, day: "2-digit", month: "short" });
  return (
    <div className="my-3 flex justify-center">
      <span className="rounded-full bg-white/80 px-3 py-0.5 text-[11px] font-medium text-zinc-500 shadow-sm ring-1 ring-zinc-200/70">{label}</span>
    </div>
  );
}

export function MessageList({ messages, campaignNames }: { messages: ChatMsg[]; campaignNames: Record<string, string> }) {
  const tz = { timeZone: "America/Sao_Paulo" } as const;
  return (
    <>
      {messages.map((m, i) => {
        const newDay = i === 0 || new Date(messages[i - 1].createdAt).toLocaleDateString("pt-BR", tz) !== new Date(m.createdAt).toLocaleDateString("pt-BR", tz);
        return (
          <Fragment key={m.id}>
            {newDay && <DaySeparator iso={m.createdAt} />}
            {m.kind === "click" ? (
              <div className="my-2 flex justify-center">
                <span className="flex items-center gap-1.5 rounded-full bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700 ring-1 ring-sky-200">
                  <MousePointerClick className="size-3.5" /> {m.text} · {time(m.createdAt)}
                </span>
              </div>
            ) : (
              <div className="py-1"><Bubble m={m} campaignName={m.campaignId ? campaignNames[m.campaignId] : undefined} /></div>
            )}
          </Fragment>
        );
      })}
    </>
  );
}
