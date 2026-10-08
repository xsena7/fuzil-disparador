"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { AlertTriangle, Info, Siren, X } from "lucide-react";

type A = { id: string; title: string; message: string; severity: "INFO" | "WARNING" | "CRITICAL"; createdAt: string };

/** Busca alertas novos a cada 15s e mostra como notificação no canto da tela (e no navegador, se permitido). */
export function AlertToaster() {
  const router = useRouter();
  const [items, setItems] = useState<A[]>([]);
  const cursor = useRef(new Date().toISOString());

  useEffect(() => {
    let stop = false;
    const poll = async () => {
      try {
        const res = await fetch(`/api/alerts/recent?after=${encodeURIComponent(cursor.current)}`, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { alerts: A[]; now: string };
        if (json.alerts.length) {
          cursor.current = json.alerts[json.alerts.length - 1].createdAt;
          setItems((cur) => [...cur, ...json.alerts].slice(-4));
          router.refresh();
          if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
            for (const a of json.alerts) new Notification(`Fuzil · ${a.title}`, { body: a.message, icon: "/icon.svg" });
          }
          for (const a of json.alerts) {
            if (a.severity === "INFO") setTimeout(() => setItems((cur) => cur.filter((x) => x.id !== a.id)), 8000);
          }
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
    <div className="fixed bottom-24 right-5 z-50 flex w-96 flex-col gap-2">
      {items.map((a) => {
        const Icon = a.severity === "CRITICAL" ? Siren : a.severity === "WARNING" ? AlertTriangle : Info;
        return (
          <div key={a.id} className="animate-fade-up flex gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-lift">
            <div className={clsx("flex size-9 shrink-0 items-center justify-center rounded-xl", a.severity === "CRITICAL" ? "bg-rose-50 text-rose-600" : a.severity === "WARNING" ? "bg-amber-50 text-amber-600" : "bg-sky-50 text-sky-600")}>
              <Icon className="size-4" />
            </div>
            <Link href="/alertas" className="min-w-0 flex-1" onClick={() => setItems((cur) => cur.filter((x) => x.id !== a.id))}>
              <div className="text-sm font-medium">{a.title}</div>
              <div className="line-clamp-2 text-xs text-zinc-500">{a.message}</div>
            </Link>
            <button onClick={() => setItems((cur) => cur.filter((x) => x.id !== a.id))} className="self-start text-zinc-400 hover:text-zinc-700" aria-label="Fechar">
              <X className="size-4" />
            </button>
          </div>
        );
      })}
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
