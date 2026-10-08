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
  131031: "Conta bloqueada/restrita",
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
