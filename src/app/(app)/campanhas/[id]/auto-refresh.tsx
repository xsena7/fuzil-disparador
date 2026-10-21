"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ every = 8000, live = false }: { every?: number; live?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    // Só atualiza com a aba visível (aba escondida não pesa no servidor); ao voltar, atualiza na hora
    const t = setInterval(() => { if (!document.hidden) router.refresh(); }, every);
    const onShow = () => { if (!document.hidden) router.refresh(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onShow); };
  }, [router, every]);
  if (!live) return null;
  return (
    <div className="mb-2 flex items-center justify-end gap-1.5 text-xs text-zinc-500">
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
      </span>
      Ao vivo
    </div>
  );
}
