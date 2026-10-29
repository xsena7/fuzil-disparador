import { Sparkles } from "lucide-react";
import { CHANGELOG } from "@/version";
import { requireAuth } from "@/lib/auth";
import { Badge, Card, PageHeader } from "@/components/ui";

const ADMIN = "[admin] ";

/** Áreas que o cliente pode ver (genéricas). O item cai na primeira que bater com o começo dele; o resto vira "Melhorias gerais". */
const AREAS: Array<[string, RegExp]> = [
  ["Correções", /^(corre|corrigid)/i],
  ["Segurança", /^seguran/i],
  ["Grupos de BM", /^grupos?\b/i],
  ["Templates", /template/i],
  ["Números", /n[úu]mero|smsbear|sms24h|perfil do whatsapp|foto de perfil/i],
  ["Conexões", /conex|conectar|bm rec/i],
  ["Campanhas", /campanha|disparo|agendamento|teste de envio|audi[êe]ncia|vari[áa]ve/i],
  ["Métricas e relatórios", /m[ée]trica|relat[óo]rio/i],
  ["Chat", /chat|responder/i],
  ["Fluxos", /fluxo/i],
  ["Alertas", /alerta|aviso/i],
  ["Saldo", /saldo|cr[ée]dito|cobran/i],
  ["Higienização", /higieniza/i],
  ["Gerador de links", /gerador de links|link/i],
  ["Visual", /visual|logo|celular|menu|tela/i],
  ["Velocidade", /leve|r[áa]pido|sincroniza/i],
];

/** O que o cliente vê de cada versão: só as áreas que mudaram ("Melhorias em: Campanhas · Chat"), sem contar o que foi feito. */
function clientSummary(items: string[]): string[] {
  const areas = new Set<string>();
  for (const item of items) {
    if (item.startsWith(ADMIN)) continue;
    const head = item.includes(":") ? item.split(/[:→]/)[0] : "";
    areas.add(AREAS.find(([, re]) => re.test(head))?.[0] ?? "Melhorias gerais");
  }
  // "Melhorias gerais" por último
  return [...areas].sort((a, b) => Number(a === "Melhorias gerais") - Number(b === "Melhorias gerais"));
}

export default async function NovidadesPage() {
  const auth = await requireAuth();
  const admin = auth.user.isSuperAdmin;
  const versions = CHANGELOG.map((v) => ({ ...v, areas: clientSummary(v.items) })).filter((v) => admin || v.areas.length);
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Novidades" description="O que mudou em cada versão do Fuzil Disparador." />
      {admin && (
        <p className="mb-4 rounded-xl bg-zinc-900 px-4 py-2.5 text-xs text-white">
          Você é administrador e vê tudo. Os clientes veem só a linha &quot;Melhorias em&quot; de cada versão, sem os detalhes.
        </p>
      )}
      <div className="space-y-4">
        {versions.map((v, i) => (
          <Card key={v.version} className="p-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="flex size-9 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><Sparkles className="size-4" /></div>
              <span className="text-lg font-semibold">v{v.version}</span>
              {i === 0 && <Badge color="orange">Atual</Badge>}
              <span className="ml-auto text-xs text-zinc-500">{v.date}</span>
            </div>
            {v.areas.length > 0 && (
              <p className="text-sm text-zinc-700">
                {admin && <span className="mr-1.5 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-600">cliente vê</span>}
                Melhorias em: <b className="font-medium text-zinc-900">{v.areas.join(" · ")}</b>
              </p>
            )}
            {admin && (
              <ul className="mt-3 space-y-1.5 border-t border-zinc-100 pt-3 text-sm text-zinc-700">
                {v.items.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-400" />
                    <span>
                      {item.startsWith(ADMIN) && <span className="mr-1.5 rounded bg-zinc-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">só admin</span>}
                      {item.startsWith(ADMIN) ? item.slice(ADMIN.length) : item}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ))}
      </div>
    </div>
  );
}
