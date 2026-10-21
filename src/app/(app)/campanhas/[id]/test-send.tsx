"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { testCampaignSendAction } from "@/app/actions/campaigns";
import { Button, Input } from "@/components/ui";

/** Teste de envio: UMA mensagem para um número seu, com a resposta completa da Meta. */
export function TestSend({ campaignId }: { campaignId: string }) {
  const [state, action, pending] = useActionState(testCampaignSendAction.bind(null, campaignId), undefined);
  return (
    <form action={action} className="mt-8 max-w-xl rounded-xl border border-dashed border-zinc-300 p-4">
      <div className="mb-2 font-medium">Teste de envio (1 mensagem)</div>
      <p className="mb-3 text-xs text-zinc-500">Manda só uma mensagem com o template desta campanha para o número que você digitar, sem disparar a lista.</p>
      <div className="flex flex-wrap items-center gap-2">
        <Input name="phone" placeholder="11 99999-8888" className="max-w-56" />
        <Button variant="secondary" disabled={pending}>
          {pending && <Loader2 className="size-4 animate-spin" />} Testar envio
        </Button>
      </div>
      {state?.ok && <p className="mt-3 text-sm text-emerald-700">{state.ok}</p>}
      {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}
      {state?.raw && <pre className="mt-2 overflow-x-auto rounded-lg bg-zinc-900 p-3 text-xs text-zinc-100">{state.raw}</pre>}
    </form>
  );
}
