"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, Loader2, MousePointerClick, Plus, Trash2 } from "lucide-react";
import { createMyLinkAction, deleteMyLinkAction, updateMyLinkAction } from "@/app/actions/links";
import { CopyBtn } from "./copy";

const inp = "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const btn = "inline-flex items-center justify-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 font-semibold text-white shadow-sm transition hover:opacity-90 disabled:opacity-60";

export type MyLink = { id: string; name: string; code: string; url: string; clicks: number; lastClickAt: string | null };

function Msg({ s }: { s: { ok?: string; error?: string } | undefined }) {
  if (s?.error) return <p className="rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{s.error}</p>;
  if (s?.ok) return <p className="rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">{s.ok}</p>;
  return null;
}

export function NewLinkForm() {
  const [state, action, pending] = useActionState(createMyLinkAction, undefined);
  const [v, setV] = useState({ name: "", url: "" });
  const router = useRouter();
  useEffect(() => {
    if (state?.ok) {
      setV({ name: "", url: "" });
      router.refresh();
    }
  }, [state, router]);
  return (
    <form action={action} className="rounded-3xl bg-white p-6 text-zinc-700 shadow-2xl ring-1 ring-black/5">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-zinc-900"><Plus className="size-5 text-orange-500" /> Novo link</h2>
      <div className="grid gap-3 md:grid-cols-[1fr_1.6fr_auto] md:items-end">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Nome</span>
          <input name="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required placeholder="Ex.: Loja - outubro" className={inp} />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Para onde a pessoa vai quando clicar</span>
          <input name="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} required placeholder="https://seusite.com.br" className={inp} />
        </label>
        <button disabled={pending} className={btn}>{pending && <Loader2 className="size-4 animate-spin" />} Gerar código</button>
      </div>
      <div className="mt-3"><Msg s={state} /></div>
    </form>
  );
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }) : "ninguém clicou ainda";

export function LinkCard({ link, base }: { link: MyLink; base: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(updateMyLinkAction.bind(null, link.id), undefined);
  const [v, setV] = useState({ name: link.name, url: link.url });
  const [deleting, startDelete] = useTransition();
  const [confirming, setConfirming] = useState(false);
  const router = useRouter();
  const t = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => { if (state?.ok) router.refresh(); }, [state, router]);
  const full = `https://${base}/${link.code}`;
  return (
    <div className="overflow-hidden rounded-2xl bg-white text-zinc-700 shadow-lg ring-1 ring-black/5">
      <div className="flex flex-wrap items-center gap-4 p-5">
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold text-zinc-900">{link.name}</div>
          <div className="truncate text-xs text-zinc-500">{link.url}</div>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-orange-50 px-3 py-2 ring-1 ring-orange-200">
          <span className="font-mono text-lg font-bold tracking-wide text-orange-700">{link.code}</span>
          <CopyBtn text={link.code} label="Copiar" />
        </div>
        <div className="text-right">
          <div className="flex items-center justify-end gap-1 text-lg font-bold tabular-nums text-zinc-900"><MousePointerClick className="size-4 text-zinc-400" /> {link.clicks.toLocaleString("pt-BR")}</div>
          <div className="text-[11px] text-zinc-500">{when(link.lastClickAt)}</div>
        </div>
        <button type="button" onClick={() => setOpen(!open)} className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700" aria-label="Editar">
          <ChevronDown className={`size-5 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && (
        <div className="space-y-4 border-t border-zinc-100 bg-zinc-50/60 p-5">
          <div className="flex items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 ring-1 ring-zinc-200">
            <a href={full} target="_blank" rel="noreferrer" className="truncate text-sm text-sky-700 hover:underline">{full}</a>
            <CopyBtn text={full} />
          </div>
          <form action={action} className="grid gap-3 md:grid-cols-[1fr_1.6fr_auto] md:items-end">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Nome</span>
              <input name="name" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required className={inp} />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium">Destino</span>
              <input name="url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} required className={inp} />
            </label>
            <button disabled={pending} className={btn}>{pending && <Loader2 className="size-4 animate-spin" />} Salvar</button>
          </form>
          <Msg s={state} />
          <div className="flex justify-end">
            <button
              type="button"
              disabled={deleting}
              onClick={() => {
                if (!confirming) {
                  setConfirming(true);
                  clearTimeout(t.current);
                  t.current = setTimeout(() => setConfirming(false), 4000);
                  return;
                }
                startDelete(async () => { await deleteMyLinkAction(link.id); router.refresh(); });
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition ${confirming ? "bg-rose-600 text-white" : "text-rose-600 hover:bg-rose-50"}`}
            >
              {deleting ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} {confirming ? "Toque de novo para apagar" : "Apagar link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
