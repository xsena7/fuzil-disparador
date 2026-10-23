"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "@/components/toast";
import { Check, Copy, Loader2 } from "lucide-react";
import { testCampaignSendAction } from "@/app/actions/campaigns";
import { Button, Input } from "@/components/ui";

/** Teste de envio: UMA mensagem para um número seu, com a resposta completa da Meta. */
export function TestSend({ campaignId }: { campaignId: string }) {
  const [state, action, pending] = useActionState(testCampaignSendAction.bind(null, campaignId), undefined);
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (state?.ok) toast("success", "Mensagem de teste enviada! Confira no WhatsApp do número que você digitou.");
    else if (state?.error) toast("error", "A Meta não aceitou a mensagem de teste. Os detalhes estão logo abaixo do botão.");
  }, [state]);
  const copy = async () => {
    if (!state?.raw) return;
    await navigator.clipboard.writeText(state.raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <form action={action} className="mt-8 max-w-xl rounded-xl border border-dashed border-zinc-300 p-4">
      <div className="mb-2 font-medium">Teste de envio (1 mensagem)</div>
      <p className="mb-3 text-xs text-zinc-500">Manda só uma mensagem para o número que você digitar, sem disparar a lista. Sai preenchida igual ao disparo, com os dados da 1ª linha da planilha.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input name="phone" placeholder="11 99999-8888" className="max-w-56" />
        <Button variant="secondary" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Testar envio
        </Button>
      </div>
      {state?.ok && <p className="mt-3 text-sm text-emerald-700">{state.ok}</p>}
      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state?.raw && (
        <div className="relative mt-2">
          <button type="button" onClick={copy} className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-zinc-700 px-2 py-1 text-xs text-white hover:bg-zinc-600">
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />} {copied ? "Copiado" : "Copiar"}
          </button>
          <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 pt-9 text-xs text-zinc-100">{state.raw}</pre>
        </div>
      )}
    </form>
  );
}
