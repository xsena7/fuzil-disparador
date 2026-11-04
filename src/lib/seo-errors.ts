// Páginas públicas dos erros da Meta (site, para quem procura "erro 131026 WhatsApp" no Google).
// Usa as mesmas traduções do painel; o texto de "o que significa" vem da explicação mais detalhada quando existe.
import { META_ERRORS } from "./meta-errors-text";
import { META_CODES } from "./explain";

export type PublicError = { code: number; title: string; meaning: string; action: string; urgent: boolean };

// Erros internos ou genéricos demais para uma página própria
const SKIP = new Set([0, 1, 2, 3]);
// Textos de suporte interno (painel de administrador) não vão para o site
const INTERNAL = /admin|system user|token do/i;

export function publicErrors(): PublicError[] {
  return Object.entries(META_ERRORS)
    .map(([c, [title, explain]]) => {
      const code = Number(c);
      const extra = META_CODES[code];
      return {
        code,
        title,
        meaning: extra?.meaning && !INTERNAL.test(extra.meaning) ? extra.meaning : explain,
        // "Nada." (texto curto dos alertas) vira uma frase completa para quem chega pelo Google
        action: (extra?.action && !INTERNAL.test(extra.action) ? extra.action : explain).replace(/^Nada[.:]\s*/, "Não é um problema da sua conta. "),
        urgent: extra?.urgency === "URGENTE",
      };
    })
    .filter((e) => !SKIP.has(e.code))
    .sort((a, b) => a.code - b.code);
}

export function publicError(code: number) {
  return publicErrors().find((e) => e.code === code) ?? null;
}

/** Grupo do erro na lista (pelo começo do código). */
export function errorGroup(code: number): string {
  if (code >= 132000 && code < 133000) return "Template e variáveis";
  if (code >= 133000 && code < 134000) return "Registro do número";
  if (code === 131042 || code === 131044) return "Pagamento";
  if ([4, 17, 32, 613, 80007, 130429, 131056].includes(code)) return "Velocidade e limites";
  if (code >= 130000) return "Envio de mensagens";
  return "Acesso e permissões";
}
