// Templates do funil do gerador de links (login por WhatsApp). Sem next/headers: o worker também usa.
import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { prisma } from "./db";

export const LINKS_TEMPLATES = {
  code: {
    prefix: "fzlinks_codigo",
    category: "AUTHENTICATION",
    components: [
      { type: "BODY", add_security_recommendation: true },
      { type: "FOOTER", code_expiration_minutes: 10 },
      { type: "BUTTONS", buttons: [{ type: "OTP", otp_type: "COPY_CODE", text: "Copiar código" }] },
    ],
  },
  login: {
    prefix: "fzlinks_acesso",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Novo acesso à sua conta do gerador de links em {{1}}.\n\nFoi você? Toque em um dos botões abaixo para confirmar. Se não reconhece este acesso, toque em \"Não fui eu\" e desconectamos todos os aparelhos.",
        example: { body_text: [["22/10 às 14:32"]] },
      },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Fui eu" }, { type: "QUICK_REPLY", text: "Não fui eu" }] },
    ],
  },
  // Boas-vindas no primeiro acesso: a pessoa toca em "Recebi" e abre conversa de verdade (bom para a BM)
  welcome: {
    prefix: "fzlinks_boasvindas",
    category: "UTILITY",
    components: [
      {
        type: "BODY",
        text: "Olá, {{1}}. Seu cadastro no gerador de links foi concluído.\n\nOs avisos de acesso à sua conta serão enviados para este número. Toque em \"Recebi\" para confirmar o recebimento.",
        example: { body_text: [["Maria"]] },
      },
      { type: "BUTTONS", buttons: [{ type: "QUICK_REPLY", text: "Recebi" }] },
    ],
  },
} as const;

export function makeLinksBlueprint(workspaceId: string, groupId: string | null, kind: keyof typeof LINKS_TEMPLATES, suffix = randomBytes(2).toString("hex")) {
  const t = LINKS_TEMPLATES[kind];
  return prisma.templateBlueprint.create({
    data: { workspaceId, groupId, name: `${t.prefix}_${suffix}`, language: "pt_BR", category: t.category, components: t.components as unknown as Prisma.InputJsonValue },
  });
}

/**
 * Confere o funil do gerador de links: o template de código e o de aviso de acesso têm que existir,
 * estar ativos e no mesmo grupo do funil. Faltou algum (apagado, grupo trocado...): conserta sozinho.
 */
export async function ensureLinksBlueprints() {
  const funnels = await prisma.funnel.findMany({ where: { kind: "LINKS" } });
  for (const f of funnels) {
    for (const [kind, field] of [["code", "codeBlueprintId"], ["login", "loginBlueprintId"]] as const) {
      const id = f[field];
      const bp = id ? await prisma.templateBlueprint.findFirst({ where: { id, workspaceId: f.workspaceId } }) : null;
      if (!bp) {
        const created = await makeLinksBlueprint(f.workspaceId, f.groupId, kind);
        await prisma.funnel.update({ where: { id: f.id }, data: { [field]: created.id } });
        console.log(`[links] template ${kind} recriado no funil ${f.id}`);
      } else if (!bp.active || bp.groupId !== f.groupId) {
        await prisma.templateBlueprint.update({ where: { id: bp.id }, data: { active: true, groupId: f.groupId } });
      }
    }
  }
}
