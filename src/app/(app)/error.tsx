"use client";

import { useEffect } from "react";
import { RefreshCw } from "lucide-react";

/** Tela amigável quando algo quebra no painel (ex.: o servidor atualizou com a página aberta). */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const outdated = /Server Action|Failed to find|ChunkLoadError|Loading chunk/i.test(error.message);
  useEffect(() => {
    // Versão nova no ar: recarrega sozinho uma vez
    if (outdated && !sessionStorage.getItem("fuzil-reloaded")) {
      sessionStorage.setItem("fuzil-reloaded", "1");
      window.location.reload();
    }
  }, [outdated]);
  return (
    <div className="mx-auto mt-24 max-w-md rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-soft">
      <div className="text-lg font-semibold">{outdated ? "O painel foi atualizado" : "Algo deu errado nesta tela"}</div>
      <p className="mt-2 text-sm text-zinc-500">
        {outdated ? "Saiu uma versão nova enquanto a página estava aberta. Recarregue para continuar." : "Tente de novo. Se continuar, use o bichinho 🐞 no canto da tela para reportar."}
      </p>
      {error.digest && <p className="mt-2 font-mono text-xs text-zinc-400">código {error.digest}</p>}
      <div className="mt-6 flex justify-center gap-2">
        <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-medium text-white">
          <RefreshCw className="size-4" /> Recarregar
        </button>
        {!outdated && <button onClick={reset} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium">Tentar de novo</button>}
      </div>
    </div>
  );
}
