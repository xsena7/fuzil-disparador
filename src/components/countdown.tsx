"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

function fmt(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

/** Contagem regressiva ao vivo. Ao zerar, recarrega os dados da tela. */
export function Countdown({ to, done = "liberado" }: { to: string; done?: string }) {
  const router = useRouter();
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());
  const refreshed = useRef(false);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = target - now;
  useEffect(() => {
    if (left <= 0 && !refreshed.current) {
      refreshed.current = true;
      router.refresh();
    }
  }, [left, router]);
  const at = new Date(to).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  return (
    <span title={at} className="tabular-nums" suppressHydrationWarning>
      {left <= 0 ? done : fmt(left)}
    </span>
  );
}
