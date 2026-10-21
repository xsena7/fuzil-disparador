"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Clock, Loader2, RefreshCw, XCircle } from "lucide-react";
import { checkDomainAction } from "@/app/actions/funnels";
import type { DomainCheck } from "@/lib/domain-check";
import { Button } from "@/components/ui";

function Row({ ok, wait, label, detail }: { ok: boolean; wait?: boolean; label: string; detail: string }) {
  const Icon = ok ? CheckCircle2 : wait ? Clock : XCircle;
  return (
    <li className="flex items-start gap-2.5">
      <Icon className={`mt-0.5 size-4 shrink-0 ${ok ? "text-emerald-600" : wait ? "text-amber-500" : "text-red-500"}`} />
      <span>
        <b className="text-zinc-800">{label}</b> <span className="text-zinc-500">{detail}</span>
      </span>
    </li>
  );
}

/** Botão "Verificar agora": DNS do domínio e do www pelo DNS público + teste do HTTPS. */
export function DomainChecker({ funnelId, domain, initial }: { funnelId: string; domain: string; initial: DomainCheck }) {
  const [r, setR] = useState<DomainCheck>(initial);
  const [error, setError] = useState("");
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ip = r.serverIps[0] ?? "o IP do servidor";
  const where = (list: string[]) => (list.length ? `aponta para ${list.join(", ")}` : "ainda sem registro");

  return (
    <div className="mt-3 rounded-lg border border-zinc-200 bg-white p-3">
      <ul className="space-y-1.5">
        <Row ok={r.rootOk} wait={!r.rootIps.length} label={domain} detail={r.rootOk ? "apontado ✅" : `${where(r.rootIps)} (precisa ser ${ip})`} />
        <Row ok={r.wwwOk} wait={!r.wwwIps.length} label={`www.${domain}`} detail={r.wwwOk ? "apontado ✅" : `${where(r.wwwIps)} (precisa ser ${ip})`} />
        {r.ipv6?.length > 0 && (
          <Row ok={false} label="Registro AAAA (IPv6)" detail={`apague no DNS: ${r.ipv6.join(", ")}. Ele faz o site não abrir para parte das pessoas`} />
        )}
        {r.https !== null && (
          <Row ok={r.https} wait={!r.https} label="Cadeado (HTTPS)" detail={r.https ? "funcionando, a página já abre no domínio ✅" : "sendo gerado, verifique de novo em 1 minuto"} />
        )}
      </ul>
      {r.rootOk && r.https && !r.ipv6?.length && <p className="mt-2 font-medium text-emerald-700">Tudo pronto! Já pode usar https://{domain} nos anúncios.</p>}
      {!r.rootOk && <p className="mt-2 text-xs text-zinc-500">A propagação leva de alguns minutos a algumas horas depois de salvar no registro.br.</p>}
      <div className="mt-3 flex items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            start(async () => {
              setError("");
              const res = await checkDomainAction(funnelId);
              if (res.result) {
                setR(res.result);
                setCheckedAt(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
                router.refresh();
              } else setError(res.error ?? "Não deu para verificar");
            })
          }
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />} Verificar agora
        </Button>
        {checkedAt && !error && <span className="text-xs text-zinc-500">Verificado às {checkedAt}</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
    </div>
  );
}
