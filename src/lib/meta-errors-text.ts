// Erros da Meta em português simples (sem nada de servidor: roda no navegador também).

/**
 * Erros da Meta em português simples: [o que aconteceu, explicação para leigo com o que fazer].
 * O título é curto (cabe numa tabela); a explicação aparece nos avisos e nas telas de detalhe.
 */
export const META_ERRORS: Record<number, [string, string]> = {
  0: ["Acesso à Meta falhou", "A Meta não reconheceu a conexão do Fuzil com essa conta. Reconecte a BM em Conexões."],
  1: ["Erro na Meta", "A Meta teve um problema do lado dela. Espere uns minutos e tente de novo."],
  2: ["Meta fora do ar no momento", "O serviço da Meta ficou instável por um instante. O Fuzil tenta de novo sozinho."],
  3: ["Função não liberada pela Meta", "A Meta ainda não liberou essa função para o aplicativo. Fale com o suporte do Fuzil."],
  4: ["Muitos pedidos seguidos", "O Fuzil pediu coisas demais para a Meta em pouco tempo. É só esperar uns minutos: ele tenta de novo sozinho."],
  10: ["Sem permissão", "O Fuzil não tem permissão nessa conta. Reconecte a BM em Conexões e marque todas as permissões."],
  17: ["Muitos pedidos seguidos", "A Meta pediu para o Fuzil ir mais devagar. Ele tenta de novo sozinho daqui a pouco."],
  32: ["Muitos pedidos seguidos", "A Meta pediu para o Fuzil ir mais devagar. Ele tenta de novo sozinho daqui a pouco."],
  100: ["Dado inválido", "A Meta não aceitou alguma informação enviada (um campo vazio, um número ou um item que não existe mais). Confira o que foi preenchido."],
  190: ["Conexão com a Meta expirou", "A autorização do Fuzil nessa BM venceu ou foi tirada. Reconecte a BM em Conexões."],
  200: ["Sem permissão", "O Fuzil não tem permissão para fazer isso nessa conta. Reconecte a BM em Conexões e marque todas as permissões."],
  368: ["Conta bloqueada por um tempo", "A Meta bloqueou a conta temporariamente por achar que ela quebrou alguma regra. Espere o bloqueio passar e use outra BM enquanto isso."],
  613: ["Muitos pedidos seguidos", "A Meta pediu para o Fuzil ir mais devagar. Ele tenta de novo sozinho daqui a pouco."],
  80007: ["Limite de pedidos da conta", "Essa conta do WhatsApp fez pedidos demais para a Meta em pouco tempo. O Fuzil tenta de novo sozinho em alguns minutos."],
  130429: ["Envio rápido demais", "O número mandou mensagens mais rápido do que a Meta deixa. O Fuzil diminui a velocidade e reenvia sozinho."],
  130472: ["Contato em teste da Meta", "A Meta separou esse contato para um teste interno dela e não entregou. Não é problema da sua conta."],
  130497: ["País bloqueado para essa conta", "Essa conta não pode mandar mensagem para números desse país."],
  131000: ["Erro na Meta", "A Meta falhou sem dizer o motivo. Normalmente é coisa passageira: tente de novo em instantes."],
  131005: ["Acesso negado", "A Meta não deixou o Fuzil fazer isso nessa conta. Reconecte a BM em Conexões."],
  131008: ["Faltou uma informação", "Algum campo obrigatório ficou vazio (por exemplo, uma variável do template). Confira o conteúdo da campanha."],
  131009: ["Informação inválida", "Algum valor enviado não está no formato que a Meta aceita (por exemplo, um link ou um número errado)."],
  131016: ["Meta fora do ar no momento", "O WhatsApp ficou instável por um instante. O Fuzil tenta de novo sozinho."],
  131021: ["Mandou para o próprio número", "O número que dispara e o contato são o mesmo. Use outro número para testar."],
  131026: ["Não entregue", "O contato não recebeu: o número não tem WhatsApp, bloqueou a sua empresa ou está com o WhatsApp desatualizado."],
  131030: ["Número fora da lista de teste", "O número de teste da Meta só manda para os contatos cadastrados na lista dele. Use um número de verdade para disparar."],
  131031: ["Conta bloqueada pela Meta", "A Meta travou essa conta do WhatsApp (verificação pendente ou violação de regra). Ela não consegue disparar até a Meta liberar."],
  131037: ["Nome do WhatsApp não aprovado", "O nome de exibição do número ainda não foi aprovado pela Meta. Espere a aprovação para disparar por ele."],
  131042: ["Problema de pagamento", "A conta de anúncios ligada a essa BM está sem forma de pagamento válida ou com conta em aberto. Arrume o pagamento na Meta (Conexões → Pagamento na Meta)."],
  131044: ["Pagamento não configurado", "Essa conta do WhatsApp ainda não tem forma de pagamento. Adicione um cartão na Meta (Conexões → Pagamento na Meta)."],
  131045: ["Número não registrado", "O número ainda não foi ativado no WhatsApp da Meta. Registre o número em Conexões."],
  131047: ["Passou das 24h", "Só dá para mandar mensagem livre até 24h depois da última resposta do contato. Depois disso, só com template."],
  131048: ["Limite por denúncia (spam)", "Muita gente bloqueou ou denunciou as mensagens desse número, e a Meta limitou os envios. Dê um descanso para o número e revise o texto."],
  131049: ["A Meta segurou a mensagem", "A Meta decidiu não entregar para não cansar o contato (ele já recebeu muitas mensagens de empresas). Tente de novo outro dia."],
  131050: ["Contato não quer receber", "O contato pediu para não receber mensagens de marketing da sua empresa."],
  131051: ["Tipo de mensagem não aceito", "Esse tipo de mensagem não pode ser enviado pelo WhatsApp."],
  131052: ["Não deu para baixar a mídia", "A Meta não conseguiu baixar o arquivo que o contato mandou. Peça para ele enviar de novo."],
  131053: ["Não deu para enviar a mídia", "A Meta não conseguiu pegar o arquivo (foto, vídeo ou PDF). Confira se ele está no formato e tamanho certos."],
  131056: ["Mensagens demais para o mesmo contato", "Foram muitas mensagens para a mesma pessoa em pouco tempo. O Fuzil espera e manda de novo sozinho."],
  131057: ["Conta em manutenção", "A conta do WhatsApp está em manutenção na Meta. Espere um pouco e tente de novo."],
  132000: ["Variáveis não batem com o template", "A quantidade de variáveis preenchidas é diferente da que o template pede. Confira a etapa Conteúdo da campanha."],
  132001: ["Template não encontrado", "Esse template não existe nessa conta ou nesse idioma (pode ter sido apagado ou ainda não foi aprovado)."],
  132005: ["Texto grande demais", "Com as variáveis preenchidas, o texto ficou maior do que a Meta deixa. Use valores mais curtos."],
  132007: ["Texto fora das regras", "O conteúdo das variáveis quebra alguma regra de formatação da Meta. Revise os textos."],
  132012: ["Variável no formato errado", "Alguma variável foi preenchida com um tipo de dado errado (por exemplo, texto onde a Meta espera um link)."],
  132015: ["Template pausado", "A Meta pausou o template por qualidade baixa (muita gente bloqueou ou denunciou). O Fuzil manda uma versão nova para análise."],
  132016: ["Template desativado", "A Meta desativou o template de vez por qualidade baixa. É preciso usar outro template."],
  132018: ["Variável com quebra de linha", "O texto de uma variável não pode ter quebra de linha, tabulação ou mais de 4 espaços seguidos."],
  132068: ["Fluxo bloqueado", "O formulário (Flow) do WhatsApp ligado a esse template está bloqueado na Meta."],
  132069: ["Fluxo limitado", "O formulário (Flow) do WhatsApp ligado a esse template está com envio limitado na Meta."],
  133000: ["Número no meio de uma troca", "O número ainda está saindo de outra conta. Espere uns minutos e tente de novo."],
  133004: ["Meta fora do ar no momento", "O serviço de registro da Meta ficou instável. Tente de novo em alguns minutos."],
  133005: ["PIN de duas etapas errado", "O PIN de 6 números da verificação em duas etapas não confere. Use o PIN certo ou desligue a verificação no WhatsApp Manager."],
  133006: ["Número precisa ser verificado de novo", "A Meta pediu para confirmar o número de novo com o código por SMS ou ligação."],
  133008: ["Muitas tentativas de PIN", "Erraram o PIN várias vezes. A Meta liberou de novo só depois de um tempo."],
  133009: ["PIN digitado rápido demais", "Espere alguns segundos entre uma tentativa de PIN e outra."],
  133010: ["Número não registrado", "O número ainda não foi ativado no WhatsApp da Meta. Registre o número em Conexões."],
  133015: ["Espere para registrar de novo", "Esse número foi apagado há pouco tempo. A Meta pede para esperar uns minutos antes de registrar de novo."],
  133016: ["Limite de registros do número", "O número foi registrado e tirado muitas vezes seguidas. A Meta bloqueia por um tempo: tente de novo mais tarde."],
  135000: ["Erro nos dados enviados", "A Meta não aceitou o pedido por algum dado errado. Confira o que foi preenchido."],
  136025: ["Código errado", "O código digitado não é o que chegou no número. Confira e tente de novo."],
};

/** Título curto em português (cabe numa tabela). */
export function metaErrorLabel(code?: number | null): string {
  if (code === null || code === undefined) return "Erro desconhecido";
  return META_ERRORS[code]?.[0] ?? `Erro da Meta (código ${code})`;
}

/** Explicação para leigo, com o que fazer. */
export function metaErrorExplain(code?: number | null): string | null {
  return code !== null && code !== undefined ? META_ERRORS[code]?.[1] ?? null : null;
}

// Frases que a Meta manda em inglês (no motivo ou nos detalhes) → português simples
const META_TEXTS: Array<[RegExp, string | ((m: RegExpMatchArray) => string)]> = [
  [/fetch failed|ECONNRESET|ETIMEDOUT|ENOTFOUND|socket hang up|network error|aborted due to timeout|operation was aborted/i, "Não consegui falar com a Meta agora (falha de conexão). Tente de novo em instantes."],
  [/more than 24 hours have passed|re-?engagement message/i, "Passou das 24h desde a última resposta do contato: agora só dá para mandar template."],
  [/not in allowed list/i, "O número de teste da Meta só manda para os contatos cadastrados na lista dele."],
  [/template name does not exist|template .*does not exist|translation .* does not exist|could not find .*template/i, "Esse template não existe nessa conta ou nesse idioma."],
  [/number of (localizable_)?params? .*(does not|doesn't) match|parameter count mismatch|expected number of params/i, "A quantidade de variáveis preenchidas é diferente da que o template pede."],
  [/new-?line|tab characters|consecutive spaces/i, "O texto de uma variável não pode ter quebra de linha, tabulação ou mais de 4 espaços seguidos."],
  [/the parameter (\S+) is required|missing (required )?param(eter)?s?:? ?(\S+)?/i, "Faltou preencher uma informação obrigatória."],
  [/(error validating|invalid oauth|expired) .*access token|session has expired|access token .*(expired|invalid)/i, "A autorização do Fuzil nessa BM venceu ou foi tirada. Reconecte a BM em Conexões."],
  [/does not have (the )?(capability|permission)|permissions? (error|denied)|not authorized|requires .*permission/i, "O Fuzil não tem permissão para fazer isso nessa conta. Reconecte a BM marcando todas as permissões."],
  [/unsupported (post|get|delete) request|object with id .* does not exist|cannot be loaded due to missing permissions/i, "A Meta não encontrou esse item (número, conta ou template) ou o Fuzil não tem acesso a ele."],
  [/payment|billing|credit line|payment method/i, "Problema de pagamento na Meta: a conta está sem cartão válido ou com conta em aberto."],
  [/account (has been |is )?(locked|restricted|disabled|banned|suspended)|violat/i, "A Meta bloqueou ou restringiu essa conta por quebra de regra."],
  [/spam rate limit/i, "Muita gente bloqueou ou denunciou, e a Meta limitou os envios desse número."],
  [/pair rate limit|too many messages .* (user|recipient)/i, "Muitas mensagens para o mesmo contato em pouco tempo."],
  [/rate limit|too many (calls|requests)|throughput|throttl/i, "Foram muitos pedidos seguidos para a Meta. É só esperar um pouco."],
  [/undeliverable|unable to deliver|not a (valid )?whatsapp user|incapable of receiving/i, "O contato não recebeu: o número não tem WhatsApp ou bloqueou a sua empresa."],
  [/healthy ecosystem|ecosystem engagement/i, "A Meta segurou a mensagem para não cansar o contato. Tente outro dia."],
  [/media (upload|download)|unable to (fetch|download)|failed to download|invalid (image|video|media|file)|unsupported (file|media|mime)/i, "A Meta não conseguiu usar o arquivo (foto, vídeo ou PDF). Confira o formato e o tamanho."],
  [/(file|image|video|media) .*(too (large|big)|size)/i, "O arquivo é grande demais para o WhatsApp."],
  [/two[- ]step verification|\bpin\b/i, "Problema com o PIN de 6 números da verificação em duas etapas do número."],
  [/display name|verified name/i, "Problema com o nome de exibição do número (ele precisa ser aprovado pela Meta)."],
  [/not registered|registration/i, "O número ainda não está ativado no WhatsApp da Meta. Registre em Conexões."],
  [/already (registered|in use|exists|connected)|has already been/i, "Isso já existe ou já está em uso em outra conta."],
  [/content in this language already exists|name .* already/i, "Já existe um template com esse nome nesse idioma."],
  [/(variable|parameter)s? .*(start|end|beginning)|(start|end)s? with a (variable|parameter)/i, "O texto do template não pode começar nem terminar com uma variável."],
  [/too many (variables|parameters)|parameters? .* relative to|\bratio\b/i, "O template tem variável demais para o tamanho do texto. Escreva mais texto fixo."],
  [/(too long|exceed(s|ed)?|maximum length|character limit|max(imum)? .* characters)/i, "O texto passou do tamanho máximo permitido."],
  [/invalid (format|parameter|value)|is not valid|malformed|invalid .* (url|link|number|phone)/i, "A Meta não aceitou algum valor enviado: confira o que foi preenchido."],
  [/verification code|code .* (incorrect|invalid|expired|wrong)|wrong code/i, "O código está errado ou venceu. Peça um novo."],
  [/too many attempts|try again later/i, "Muitas tentativas seguidas. Espere um pouco e tente de novo."],
  [/limit (reached|exceeded)|maximum number/i, "A conta chegou no limite da Meta para isso."],
  [/temporar(il)?y|unavailable|timeout|timed out|try again/i, "A Meta ficou instável por um instante. Tente de novo em alguns minutos."],
  [/unknown error|unexpected error|something went wrong|an error occurred/i, "A Meta falhou sem dizer o motivo. Normalmente é passageiro: tente de novo."],
];

const looksEnglish = (t: string) =>
  (/\b(the|is|are|not|could|can|has|have|been|was|for|this|that|with|your|to|of|be|an|invalid|error|failed|failure|message|request|unable|please|limit|rate|hit|spam|account|number|phone|parameter|access|token|user|business|missing|required|exceeded|unsupported|something|went|wrong|unknown|occurred|unexpected|temporarily|unavailable|blocked|locked|restricted)\b/i.test(t) || /ECONN|ETIMEDOUT|ENOTFOUND/.test(t)) &&
  !/[ãõçéêáíóú]|\b(não|você|está|conta|número|para|com|uma|que|outro|outra|pelo|seu|sua|ainda|já|mais|tente|confira|erro)\b/i.test(t);

/** Traduz um texto da Meta para português simples (devolve o próprio texto se já estiver em português). */
export function translateMetaText(text: string | null | undefined): string | null {
  const t = String(text ?? "").trim();
  if (!t) return null;
  // Já está em português (ou é um texto nosso): não mexe
  if (!looksEnglish(t) && !/\(#\d+\)/.test(t)) return t;
  for (const [re, pt] of META_TEXTS) {
    const m = t.match(re);
    if (m) return typeof pt === "string" ? pt : pt(m);
  }
  // "(#131026) ..." sem frase conhecida → usa o código
  const code = t.match(/\(#(\d{1,7})\)/)?.[1];
  if (code && META_ERRORS[Number(code)]) return META_ERRORS[Number(code)][1];
  return looksEnglish(t) ? "A Meta recusou sem um motivo conhecido. Tente de novo; se continuar, reporte pelo 🐞 no canto da tela." : t;
}

// Códigos que não dizem nada sozinhos: o detalhe (traduzido) explica melhor
const VAGUE = new Set([1, 100, 131000, 131008, 131009, 135000]);

/** Erro completo para mostrar ao cliente: o que aconteceu + explicação (+ o detalhe traduzido, quando o código é vago). */
export function metaErrorText(code: number | null | undefined, ...texts: Array<string | null | undefined>): string {
  const known = code !== null && code !== undefined ? META_ERRORS[code] : undefined;
  const details = [...new Set(texts.map(translateMetaText).filter((x): x is string => Boolean(x)))];
  if (known) {
    const extra = VAGUE.has(code!) ? details.filter((d) => d !== known[1] && !d.startsWith("A Meta recusou sem")) : [];
    return extra.length ? `${known[0]}: ${extra.join(" ")}` : `${known[0]}: ${known[1]}`;
  }
  return details.length ? details.join(" ") : code ? `Erro da Meta (código ${code}).` : "A Meta recusou sem dizer o motivo.";
}

/** Motivos de reprovação de template (vêm da Meta em inglês). */
export const TEMPLATE_REJECT_REASONS: Record<string, string> = {
  INVALID_FORMAT: "Formato inválido: alguma parte do template está fora do padrão da Meta (variável no começo ou no fim, variáveis seguidas, link ou exemplo errado).",
  TAG_CONTENT_MISMATCH: "O texto não combina com a categoria escolhida: a Meta achou que não é mensagem de utilidade.",
  PROMOTIONAL: "A Meta achou o texto promocional (propaganda). Mensagem de utilidade não pode vender nem oferecer desconto.",
  SCAM: "A Meta achou que o texto pode ser golpe. Evite promessas de dinheiro, prêmio ou urgência.",
  ABUSIVE_CONTENT: "Conteúdo não permitido pelas regras do WhatsApp.",
  INCORRECT_CATEGORY: "Categoria errada para esse tipo de texto.",
  INVALID_CATEGORY: "Categoria errada para esse tipo de texto.",
  NONE: "A Meta não informou o motivo.",
};
export const templateRejectReason = (r: string | null | undefined) => (r ? TEMPLATE_REJECT_REASONS[r.toUpperCase()] ?? translateMetaText(r) ?? r : null);


/** Motivo de falha guardado no banco, em português (os antigos tinham o texto da Meta em inglês junto). */
export function errorTitlePt(code: number | null | undefined, title: string | null | undefined): string {
  const known = code !== null && code !== undefined ? META_ERRORS[code] : undefined;
  if (!title) return known?.[0] ?? (code ? `Erro da Meta (código ${code})` : "");
  if (known && / — |\[enviado:/.test(title)) return known[0];
  return (translateMetaText(title) ?? title).replace(/ \[template [^\]]+\]$/, "");
}
