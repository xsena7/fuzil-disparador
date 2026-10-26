"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { X } from "lucide-react";
import { summarizeAlert, type AlertTone } from "@/lib/alert-summary";

type A = { id: string; title: string; message: string; severity: "INFO" | "WARNING" | "CRITICAL"; createdAt: string; count?: number };
type Toast = { id: string; head: string; who: string; tone: AlertTone; severity: A["severity"] };

const TONE: Record<AlertTone, { dot: string; bar: string }> = {
  red: { dot: "bg-rose-500", bar: "bg-rose-500" },
  amber: { dot: "bg-amber-400", bar: "bg-amber-400" },
  green: { dot: "bg-emerald-500", bar: "bg-emerald-500" },
  blue: { dot: "bg-sky-500", bar: "bg-sky-500" },
};

/** Junta os iguais: "2 BMs foram para Sem número" com os nomes embaixo. */
function toToasts(alerts: A[]): Toast[] {
  const by = new Map<string, { s: ReturnType<typeof summarizeAlert>; who: string[]; first: A; severity: A["severity"] }>();
  for (const a of alerts) {
    const s = summarizeAlert(a);
    const g = by.get(s.key) ?? { s, who: [], first: a, severity: a.severity };
    if (s.who) g.who.push(s.who);
    if (a.severity === "CRITICAL" || (a.severity === "WARNING" && g.severity === "INFO")) g.severity = a.severity;
    by.set(s.key, g);
  }
  return [...by.values()].map((g) => ({
    id: `t-${g.first.id}`,
    head: g.who.length > 1 ? `${g.s.head} (${g.who.length})` : g.s.head,
    who: g.who.length > 2 ? `${g.who.slice(0, 2).join(", ")} e mais ${g.who.length - 2}` : g.who.join(", "),
    tone: g.s.tone,
    severity: g.severity,
  }));
}

// Quanto tempo cada aviso fica na tela (todos somem sozinhos; a lista completa fica em Alertas)
const STAY = { INFO: 8000, WARNING: 15000, CRITICAL: 25000 } as const;

/** Busca alertas novos a cada 15s e mostra como notificação no canto da tela (e no navegador, se permitido). */
export function AlertToaster() {
  const router = useRouter();
  const [items, setItems] = useState<Toast[]>([]);
  const cursor = useRef(new Date().toISOString());
  const seen = useRef(new Set<string>());

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/alerts/recent?after=${encodeURIComponent(cursor.current)}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { alerts: A[]; now: string };
        // Nunca mostra o mesmo alerta duas vezes
        const fresh = json.alerts.filter((a) => !seen.current.has(a.id));
        if (json.alerts.length) cursor.current = json.alerts[json.alerts.length - 1].createdAt;
        if (fresh.length) {
          for (const a of fresh) seen.current.add(a.id);
          // Iguais viram um só; muitos tipos de uma vez: um aviso só para abrir Alertas
          let show = toToasts(fresh);
          if (show.length > 3)
            show = [{ id: `grupo-${fresh[0].id}`, head: `${fresh.length} alertas novos`, who: "Toque para ver em Alertas", tone: fresh.some((a) => a.severity === "CRITICAL") ? "red" : "amber", severity: fresh.some((a) => a.severity === "CRITICAL") ? "CRITICAL" : "WARNING" }];
          setItems((cur) => [...cur, ...show].slice(-3));
          router.refresh();
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
            for (const a of show) new Notification(`Fuzil · ${a.head}`, { body: a.who, icon: "/icon.svg" });
          }
          for (const a of show) setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== a.id)), STAY[a.severity]);
        }
      } catch {
        /* sem conexão: tenta de novo no próximo ciclo */
      }
    };
    const t = setInterval(() => !stop && poll(), 15_000);
    return () => {
      stop = true;
      clearInterval(t);
    };
  }, [router]);

  if (!items.length) return null;
  return (
    <div className="fixed bottom-16 right-5 z-50 flex w-[calc(100vw-2.5rem)] flex-col gap-2 sm:w-80">
      {items.map((a) => (
        <div key={a.id} className="animate-fade-up group relative overflow-hidden rounded-xl border border-zinc-200 bg-white/95 shadow-lift backdrop-blur">
          <Link href="/alertas" className="flex items-center gap-3 px-3.5 py-3 pr-9" onClick={() => setItems((cur) => cur.filter((x) => x.id !== a.id))}>
            <span className={clsx("size-2.5 shrink-0 rounded-full", TONE[a.tone].dot)} />
            <span className="min-w-0">
              <span className="line-clamp-2 block text-sm font-semibold leading-snug text-zinc-900">{a.head}</span>
              {a.who && <span className="block truncate text-xs text-zinc-500">{a.who}</span>}
            </span>
          </Link>
          <button onClick={() => setItems((cur) => cur.filter((x) => x.id !== a.id))} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-zinc-300 hover:bg-zinc-100 hover:text-zinc-600" aria-label="Fechar">
            <X className="size-3.5" />
          </button>
          {/* Barrinha do tempo até sumir */}
          <span className={clsx("absolute bottom-0 left-0 h-0.5 animate-toast-bar", TONE[a.tone].bar)} style={{ animationDuration: `${STAY[a.severity]}ms` }} />
        </div>
      ))}
    </div>
  );
}

/** Botão para permitir notificações do navegador (aparecem mesmo com a aba em segundo plano). */
export function EnableBrowserNotifications() {
  const [state, setState] = useState<string>("default");
  useEffect(() => {
    if (typeof Notification !== "undefined") setState(Notification.permission);
    else setState("unsupported");
  }, []);
  if (state === "unsupported" || state === "granted") return null;
  return (
    <button
      onClick={async () => setState(await Notification.requestPermission())}
      className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-medium shadow-soft hover:bg-zinc-50"
    >
      {state === "denied" ? "Notificações bloqueadas no navegador" : "Ativar notificações do navegador"}
    </button>
  );
}
