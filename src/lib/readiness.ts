/** O que falta numa WABA para ela conseguir disparar. Mostrado na tela de Conexões. */

export type ReadinessIssue = { block: boolean; text: string; fix?: string };

type HealthIssue = { entity?: string; text?: string; fix?: string };

const REVIEW_PT: Record<string, string> = { PENDING: "em análise", REJECTED: "rejeitada" };

export function wabaReadiness(waba: {
  hasPaymentMethod: boolean | null;
  reviewStatus: string | null;
  status: string | null;
  healthIssues: unknown;
  lastSyncError: string | null;
  phones: Array<{ enabled: boolean; invalidReason: string | null; status: string | null }>;
  usableTemplates: number;
}): ReadinessIssue[] {
  const out: ReadinessIssue[] = [];
  if (waba.lastSyncError && /api access blocked/i.test(waba.lastSyncError))
    out.push({ block: true, text: "A Meta bloqueou o app dessa BM (API access blocked): ela não dispara.", fix: "Entre em developers.facebook.com com a conta dona do app e conclua a verificação que a Meta pedir (código ou confirmação de identidade)." });
  else if (waba.lastSyncError) out.push({ block: true, text: "O Fuzil não está conseguindo acessar essa conta na Meta.", fix: "Confira se o token ainda é válido e tem acesso a essa WABA, e conecte de novo." });
  if (waba.hasPaymentMethod === false)
    out.push({ block: true, text: "Sem forma de pagamento (cartão).", fix: "No WhatsApp Manager dessa conta: Configurações de pagamento → Adicionar forma de pagamento." });
  if (waba.reviewStatus && waba.reviewStatus !== "APPROVED")
    out.push({ block: true, text: `Conta do WhatsApp ${REVIEW_PT[waba.reviewStatus] ?? waba.reviewStatus} pela Meta.`, fix: "Aguarde a análise da Meta ou veja o motivo no WhatsApp Manager." });

  const valid = waba.phones.filter((p) => !p.invalidReason);
  const ready = valid.filter((p) => p.enabled && p.status === "CONNECTED");
  if (!valid.length) out.push({ block: true, text: "Nenhum número válido para disparar (só números de teste ou não registrados).", fix: "Adicione e registre um número real nessa conta." });
  else if (!ready.length) out.push({ block: true, text: "Nenhum número conectado e no rodízio.", fix: "Registre o número ou coloque ele de volta no rodízio." });

  if (waba.usableTemplates === 0) out.push({ block: true, text: "Nenhum template de utilidade aprovado.", fix: "Crie um template em Templates ou ative um Template padrão." });

  // Avisos que a própria Meta dá sobre a conta, os números ou a empresa
  const seen = new Set(out.map((i) => i.text));
  for (const h of (Array.isArray(waba.healthIssues) ? waba.healthIssues : []) as HealthIssue[]) {
    if (!h.text || seen.has(h.text)) continue;
    seen.add(h.text);
    out.push({ block: waba.status === "BLOCKED", text: `Meta: ${h.text}`, fix: h.fix || undefined });
  }
  if (waba.status === "BLOCKED" && !out.some((i) => i.text.startsWith("Meta:"))) out.push({ block: true, text: "A Meta informou que essa conta não pode enviar mensagens agora." });
  return out;
}

/**
 * BM apta para disparar: pelo menos uma WABA dela tem, ao mesmo tempo, cartão, número ativo
 * e um template de utilidade aprovado (o disparo usa o template da mesma WABA do número).
 */
export function bmAptidao(
  wabas: Array<{
    hasPaymentMethod: boolean | null;
    phones: Array<{ enabled: boolean; invalidReason: string | null; status: string | null }>;
    templates: Array<{ category: string; status: string }>;
  }>,
): { apta: boolean; falta: string[] } {
  if (!wabas.length) return { apta: false, falta: ["conectar uma conta"] };
  let best: string[] | null = null;
  for (const w of wabas) {
    const falta: string[] = [];
    if (w.hasPaymentMethod === false) falta.push("cartão");
    if (!w.phones.some((p) => !p.invalidReason && p.enabled && p.status === "CONNECTED")) falta.push("número registrado e ativo");
    if (!w.templates.some((t) => t.category === "UTILITY" && t.status === "APPROVED")) falta.push("template de utilidade aprovado");
    if (!falta.length) return { apta: true, falta: [] };
    if (!best || falta.length < best.length) best = falta;
  }
  return { apta: false, falta: best ?? [] };
}
