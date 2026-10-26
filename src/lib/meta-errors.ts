import { Prisma } from "@prisma/client";
import { MetaError } from "./meta";

/** Tradução dos códigos de erro mais comuns da Cloud API. */
const ERRORS: Record<number, string> = {
  0: "Falha de autenticação",
  4: "Limite de chamadas da API atingido",
  10: "Permissão negada",
  100: "Parâmetro inválido",
  190: "Token expirado ou inválido",
  200: "Permissão negada",
  368: "Bloqueado temporariamente por violação de política",
  130429: "Limite de throughput atingido (msgs/segundo)",
  130472: "Número faz parte de um experimento da Meta",
  131000: "Erro desconhecido na Meta",
  131005: "Acesso negado",
  131008: "Parâmetro obrigatório ausente",
  131009: "Valor de parâmetro inválido",
  131016: "Serviço indisponível",
  131021: "Remetente e destinatário iguais",
  131026: "Não entregue (sem WhatsApp, bloqueou o número ou app desatualizado)",
  131031: "A Meta recusou o envio (conta/número sem permissão para disparar)",
  131042: "Problema de pagamento na WABA",
  131045: "Número não registrado corretamente",
  131047: "Fora da janela de 24h",
  131048: "Limite por spam atingido (qualidade baixa)",
  131049: "A Meta optou por não entregar (limite por usuário)",
  131050: "Usuário parou de receber mensagens de marketing",
  131051: "Tipo de mensagem não suportado",
  131052: "Falha ao baixar mídia",
  131053: "Falha ao enviar mídia",
  131056: "Muitas mensagens para o mesmo número em pouco tempo",
  131057: "Conta em manutenção",
  132000: "Quantidade de variáveis não confere com o template",
  132001: "Template não existe nesse idioma/WABA",
  132005: "Texto das variáveis muito longo",
  132007: "Conteúdo viola política de formatação",
  132012: "Formato das variáveis inválido",
  132015: "Template pausado por baixa qualidade",
  132016: "Template desativado",
  132068: "Fluxo bloqueado",
  133010: "Número não registrado na Cloud API",
  135000: "Erro genérico do usuário",
  136025: "Código errado: confira o código que chegou no número",
};

export function metaErrorLabel(code?: number | null): string {
  if (code === null || code === undefined) return "Erro desconhecido";
  return ERRORS[code] ?? `Erro ${code}`;
}

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
/** Erro da Meta com o motivo completo (alguns códigos, como 100 e 131000, não dizem nada sozinhos). */
export function metaDetail(err: unknown): string {
  const base = friendlyError(err);
  if (err instanceof MetaError) {
    const extra = [err.message, err.details, err.subcode ? `subcódigo ${err.subcode}` : null].filter((x) => x && !base.includes(x)).join(" · ");
    return extra ? `${base}: ${extra}` : base;
  }
  return base;
}

export function friendlyError(err: unknown): string {
  if (err instanceof MetaError) {
    const label = err.code !== null && ERRORS[err.code] ? ERRORS[err.code] : null;
    return label ? `${label} (código ${err.code} da Meta)` : `A Meta recusou: ${err.message}`;
  }
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
  return err instanceof Error ? err.message : String(err);
}
