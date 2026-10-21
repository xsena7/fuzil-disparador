import { prisma } from "./db";
import { meta, MetaError } from "./meta";
import { wabaToken } from "./sync";
import { normalizePhone } from "./phone";

export const HYGIENE_MAX = 3000;

export type HygieneResult = { valid: string[]; invalid: string[]; notChecked: string[]; malformed: number; total: number; sender: string };

/** Escolhe um número conectado da conta para fazer a checagem (qualquer número ativo serve). */
async function pickSender(workspaceId: string) {
  const phone = await prisma.phoneNumber.findFirst({
    where: { enabled: true, invalidReason: null, status: "CONNECTED", waba: { workspaceId } },
    include: { waba: true },
  });
  return phone ? { phoneNumberId: phone.phoneNumberId, token: wabaToken(phone.waba), display: phone.displayPhoneNumber } : null;
}

/**
 * Higienização: separa os números que têm WhatsApp dos que não têm.
 * Números mal formados são contados à parte e nem vão para a Meta.
 */
export async function hygienePhones(workspaceId: string, raw: string[]): Promise<HygieneResult | { error: string }> {
  const sender = await pickSender(workspaceId);
  if (!sender) return { error: "Nenhum número conectado e ativo nesta conta para fazer a checagem." };

  const unique = new Set<string>();
  let malformed = 0;
  for (const r of raw) {
    const p = normalizePhone(r);
    if (p) unique.add(p);
    else if (r.trim()) malformed++;
  }
  const list = [...unique].slice(0, HYGIENE_MAX);
  const valid: string[] = [];
  const invalid: string[] = [];
  const notChecked: string[] = [];
  for (let i = 0; i < list.length; i += 100) {
    const chunk = list.slice(i, i + 100);
    try {
      const res = await meta.checkContacts(sender.token, sender.phoneNumberId, chunk);
      const seen = new Map((res.contacts ?? []).map((c) => [c.input.replace(/\D/g, ""), c.status]));
      for (const p of chunk) {
        const st = seen.get(p);
        if (st === "valid") valid.push(p);
        else if (st === "invalid") invalid.push(p);
        else notChecked.push(p);
      }
    } catch (err) {
      if (err instanceof MetaError && err.code === 80007) return { error: "A Meta limitou as checagens por enquanto. Tente de novo em alguns minutos." };
      notChecked.push(...chunk);
    }
  }
  return { valid, invalid, notChecked, malformed, total: raw.filter((r) => r.trim()).length, sender: sender.display };
}
