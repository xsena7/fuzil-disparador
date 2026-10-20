"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function AutoRefresh({ every = 8000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    // Só atualiza com a aba visível (aba escondida não pesa no servidor); ao voltar, atualiza na hora
    const t = setInterval(() => { if (!document.hidden) router.refresh(); }, every);
    const onShow = () => { if (!document.hidden) router.refresh(); };
    document.addEventListener("visibilitychange", onShow);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", onShow); };
  }, [router, every]);
  return null;
}
