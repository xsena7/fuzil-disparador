import { Prisma } from "@prisma/client";
import { MetaError } from "./meta";

export * from "./meta-errors-text";
import { metaErrorText, translateMetaText } from "./meta-errors-text";

/** Erros que indicam problema no remetente (não adianta tentar outro destinatário com ele). */
export const SENDER_FATAL_CODES = new Set([0, 10, 190, 200, 368, 131031, 131042, 131045, 131048, 131057, 133010]);
/** Erros que indicam problema no template (pausa a campanha). */
export const TEMPLATE_FATAL_CODES = new Set([132000, 132001, 132012, 132015, 132016]);
/** Erros temporários: o destinatário volta pra fila. */
export const RETRYABLE_CODES = new Set([4, 130429, 131000, 131016, 131056]);

/**
 * Mensagem de erro para mostrar ao cliente: erros da Meta viram a explicação em português (com o código),
 * erros internos (banco, disco) viram uma frase simples. O erro original vai para o log.
 */
/** Erro da Meta com o motivo completo, traduzido (alguns códigos, como 100 e 131000, não dizem nada sozinhos). */
export function metaDetail(err: unknown): string {
  if (err instanceof MetaError) return metaErrorText(err.code, err.message, err.details);
  return friendlyError(err);
}

export function friendlyError(err: unknown): string {
  if (err instanceof MetaError) return metaErrorText(err.code, err.message, err.details);
  const internal =
    err instanceof Prisma.PrismaClientKnownRequestError ||
    err instanceof Prisma.PrismaClientUnknownRequestError ||
    err instanceof Prisma.PrismaClientValidationError ||
    err instanceof Prisma.PrismaClientInitializationError ||
    /ECONN|ENOENT|EACCES|ENOSPC/.test(String((err as Error)?.message));
  if (internal) {
    console.error("[erro interno]", err);
    return "Não foi possível concluir agora. Tente de novo em instantes ou reporte pelo 🐞 no canto da tela.";
  }
  const msg = err instanceof Error ? err.message : String(err);
  return translateMetaText(msg) ?? msg;
}
