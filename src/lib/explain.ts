/**
 * "Tradução" dos avisos para quem não é técnico: o que significa, o que fazer e se é urgente.
 * Usado nas mensagens do Discord (alertas das contas e erros do sistema).
 */
import type { AlertSeverity } from "@prisma/client";

export type Urgency = "URGENTE" | "ATENCAO" | "INFO";
export type Explanation = { urgency: Urgency; meaning: string; action: string };

export const URGENCY_LABEL: Record<Urgency, string> = {
  URGENTE: "🔴 URGENTE: resolver agora",
  ATENCAO: "🟡 ATENÇÃO: resolver hoje",
  INFO: "🟢 Só aviso: não precisa fazer nada",
};

// ---------------------------------------------------------------------------
// Códigos de erro da Meta mais comuns no disparo
// ---------------------------------------------------------------------------

const META_CODES: Record<number, Explanation> = {
  0: { urgency: "URGENTE", meaning: "A Meta não aceitou o acesso a essa BM (token inválido).", action: "Reconecte a BM em Conexões. Se for em todas as BMs, confira o token do System User em Admin → Integração." },
  10: { urgency: "URGENTE", meaning: "O app perdeu a permissão nessa BM.", action: "Reconecte a BM em Conexões (o dono da BM precisa aceitar de novo as permissões)." },
  190: { urgency: "URGENTE", meaning: "O token de acesso expirou ou foi revogado.", action: "Gere um token novo do System User e cole em Admin → Integração, ou reconecte a BM em Conexões." },
  200: { urgency: "URGENTE", meaning: "O app perdeu a permissão nessa BM.", action: "Reconecte a BM em Conexões." },
  368: { urgency: "URGENTE", meaning: "A Meta bloqueou temporariamente essa conta por violar alguma política.", action: "Não insista com esse número. Veja no Gerenciador do WhatsApp (business.facebook.com) qual foi a violação e use outras BMs enquanto isso." },
  4: { urgency: "INFO", meaning: "Muitas chamadas para a Meta ao mesmo tempo.", action: "Nada. O Fuzil espera e tenta de novo sozinho." },
  130429: { urgency: "INFO", meaning: "O número atingiu a velocidade máxima de envio por segundo.", action: "Nada. O Fuzil reduz o ritmo e tenta de novo. Se acontecer sempre, diminua a velocidade da campanha." },
  131026: { urgency: "INFO", meaning: "A pessoa não recebeu: não tem WhatsApp, bloqueou o número ou está com o app desatualizado.", action: "Nada. É normal em toda lista; se passar de 20%, a base está ruim/antiga." },
  131031: { urgency: "URGENTE", meaning: "A conta do WhatsApp dessa BM foi bloqueada ou restringida pela Meta.", action: "Tire essa BM dos grupos de disparo e veja o motivo no Gerenciador do WhatsApp. Dá para pedir revisão por lá." },
  131042: { urgency: "URGENTE", meaning: "Problema de pagamento: a BM está sem forma de pagamento válida ou com fatura em aberto.", action: "Entre no Gerenciador do WhatsApp dessa BM → Pagamentos e regularize o cartão/fatura." },
  131045: { urgency: "URGENTE", meaning: "O número não está registrado direito na API.", action: "Reconecte o número em Conexões (pode pedir o PIN de 6 dígitos)." },
  131047: { urgency: "INFO", meaning: "Tentou mandar mensagem livre fora da janela de 24h.", action: "Nada. Só templates podem ser enviados fora da janela." },
  131048: { urgency: "URGENTE", meaning: "A Meta limitou esse número por SPAM: muita gente bloqueou ou denunciou.", action: "Pare de usar esse número por 1 ou 2 dias. Revise o texto do template e a qualidade da lista antes de voltar." },
  131049: { urgency: "ATENCAO", meaning: "A Meta escolheu não entregar para essa pessoa porque ela já recebeu muitas mensagens de empresas.", action: "Nada imediato. Evite mandar de novo para a mesma pessoa em pouco tempo." },
  131050: { urgency: "INFO", meaning: "A pessoa pediu para não receber mensagens de marketing.", action: "Nada. Ela é descartada automaticamente." },
  131053: { urgency: "ATENCAO", meaning: "A Meta não conseguiu baixar a imagem/vídeo da campanha.", action: "Suba a mídia de novo na campanha (formato JPG/PNG/MP4, até 5 MB)." },
  131056: { urgency: "INFO", meaning: "Muitas mensagens para o mesmo número em pouco tempo.", action: "Nada. O Fuzil tenta de novo mais tarde." },
  131057: { urgency: "ATENCAO", meaning: "A conta está em manutenção na Meta.", action: "Espere algumas horas. O Fuzil usa os outros números enquanto isso." },
  132000: { urgency: "URGENTE", meaning: "A quantidade de variáveis enviadas não bate com o template.", action: "Abra a campanha e confira as variáveis ({{1}}, {{2}}...) na etapa Conteúdo." },
  132001: { urgency: "URGENTE", meaning: "O template não existe nessa BM ou nesse idioma.", action: "Sincronize em Templates ou suba o template nessa BM (Templates padrão faz isso sozinho)." },
  132005: { urgency: "ATENCAO", meaning: "O texto de alguma variável ficou grande demais.", action: "Encurte o conteúdo da coluna usada na variável." },
  132012: { urgency: "URGENTE", meaning: "Formato de variável errado (ex.: link ou imagem inválidos).", action: "Confira a etapa Conteúdo da campanha: link do botão e mídia do cabeçalho." },
  132015: { urgency: "URGENTE", meaning: "A Meta PAUSOU o template por baixa qualidade (muita gente bloqueando).", action: "Use outro template. Esse volta sozinho em algumas horas, mas está queimando." },
  132016: { urgency: "URGENTE", meaning: "A Meta DESATIVOU o template de vez.", action: "Crie um template novo com outro texto." },
  133010: { urgency: "URGENTE", meaning: "O número não está registrado na Cloud API.", action: "Reconecte o número em Conexões." },
};

function metaCodeIn(text: string): number | null {
  const m = text.match(/código (\d+)/i) ?? text.match(/\(#(\d+)\)/) ?? text.match(/\b(13\d{4})\b/);
  return m ? Number(m[1]) : null;
}

/** Explicação de um código de erro da Meta (ou null se não for conhecido). */
export function explainMetaCode(code: number | null | undefined): Explanation | null {
  return code === null || code === undefined ? null : META_CODES[code] ?? null;
}

// ---------------------------------------------------------------------------
// Alertas das contas
// ---------------------------------------------------------------------------

export function explainAlert(a: { type: string; severity: AlertSeverity; title: string; message: string }): Explanation {
  const text = `${a.title} ${a.message}`;
  const bad = a.severity !== "INFO";
  const code = metaCodeIn(text);
  const byCode = explainMetaCode(code);

  switch (a.type) {
    case "CAMPAIGN_STARTED":
      return { urgency: "INFO", meaning: "A campanha começou a disparar.", action: "Nada. Acompanhe pelas métricas da campanha." };
    case "CAMPAIGN_COMPLETED":
      return { urgency: "INFO", meaning: "A campanha terminou de enviar para todo mundo da lista.", action: "Nada. Entregas, leituras e cliques continuam sendo contados por mais algumas horas." };
    case "CAMPAIGN_CANCELLED":
      return { urgency: "INFO", meaning: "Alguém cancelou a campanha; o que faltava não será enviado.", action: "Nada, a não ser que tenha sido sem querer: aí duplique a campanha." };
    case "CAMPAIGN_PAUSED":
      if (/nenhum número apto/i.test(text)) return { urgency: "URGENTE", meaning: "A campanha parou porque não sobrou nenhum número em condições de enviar (limite, qualidade vermelha, template não aprovado ou número retirado).", action: "Veja os motivos acima. Normalmente: adicione mais BMs ao grupo ou espere o limite de 24h liberar e retome." };
      if (/saldo/i.test(text)) return { urgency: "URGENTE", meaning: "A campanha parou porque a conta ficou sem créditos.", action: "Adicione créditos na conta e clique em Retomar na campanha." };
      if (/bloquead/i.test(text)) return { urgency: "ATENCAO", meaning: "A campanha parou porque a conta foi bloqueada no Admin.", action: "Desbloqueie a conta no Admin e retome a campanha." };
      if (/marketing|categoria|recategoriz/i.test(text)) return { urgency: "URGENTE", meaning: "A campanha parou porque o template virou MARKETING. O Fuzil não dispara marketing de jeito nenhum.", action: "Escolha outro template de utilidade (duplique a campanha e troque o template)." };
      if (byCode) return byCode;
      if (/template/i.test(text)) return { urgency: "URGENTE", meaning: "A campanha parou por um problema no template.", action: "Confira o template (aprovado? utilidade? variáveis certas?) e retome ou duplique a campanha." };
      return { urgency: "URGENTE", meaning: "A campanha parou sozinha por segurança.", action: "Leia o motivo acima, corrija e clique em Retomar na campanha." };
    case "LIMIT_REACHED":
      return { urgency: "INFO", meaning: "Todas as BMs do grupo bateram o limite de 24h. A campanha está esperando, não parou.", action: "Nada: ela continua sozinha quando o limite liberar. Se tiver pressa, adicione outra BM ao grupo." };
    case "SENDER_REMOVED":
      return byCode
        ? { urgency: "ATENCAO", meaning: `Um número foi tirado desta campanha. ${byCode.meaning}`, action: `A campanha segue com os outros números. ${byCode.action}` }
        : { urgency: "ATENCAO", meaning: "Um número deu erro grave e foi tirado desta campanha.", action: "A campanha segue com os outros números. Veja o motivo acima e confira essa BM em Conexões." };
    case "TEMPLATE_RECATEGORIZED":
      return /→ UTILITY/.test(a.title)
        ? { urgency: "INFO", meaning: "O template voltou a ser de utilidade.", action: "Nada. Ele volta a ser usado nos disparos." }
        : { urgency: "URGENTE", meaning: "A Meta mudou o template para MARKETING (ou avisou que vai mudar). Os números dessa BM já saíram dos disparos com ele.", action: "Não use mais esse template. Crie outro de utilidade com um texto mais 'transacional' (sem promoção, desconto, oferta)." };
    case "TEMPLATE_REJECTED":
      return { urgency: "ATENCAO", meaning: "A Meta reprovou o template.", action: "Veja o motivo em Templates, ajuste o texto (sem promoção, sem pedir clique de forma agressiva) e envie de novo." };
    case "TEMPLATE_PAUSED":
      return { urgency: "URGENTE", meaning: "A Meta pausou ou desativou o template porque muita gente bloqueou/denunciou.", action: "Troque o template nas campanhas. Pausado volta em algumas horas; desativado não volta mais." };
    case "TEMPLATE_STATUS":
      return /APPROVED/.test(a.title)
        ? { urgency: "INFO", meaning: "O template foi aprovado pela Meta e já pode ser usado.", action: "Nada." }
        : { urgency: "INFO", meaning: "O status do template mudou na Meta.", action: "Nada, só acompanhe em Templates." };
    case "TEMPLATE_AUTO_DELETED":
    case "BLUEPRINT_RECATEGORIZED":
      return { urgency: "ATENCAO", meaning: "O template virou MARKETING e o Fuzil EXCLUIU ele dessa BM sozinho, para não correr risco.", action: "Se ele era importante, crie uma versão nova com outro texto. As outras BMs não foram afetadas." };
    case "TEMPLATE_DELETE_FAILED":
      return { urgency: "URGENTE", meaning: "O template virou MARKETING e o Fuzil NÃO conseguiu excluir ele.", action: "Exclua na mão pelo Gerenciador do WhatsApp dessa BM. O Fuzil já não usa ele nos disparos." };
    case "BLUEPRINT_ERROR":
      return { urgency: "ATENCAO", meaning: "O template padrão não conseguiu ser criado nessa BM.", action: "Veja o motivo acima. Se for nome repetido ou texto recusado, ajuste em Templates padrão; o Fuzil tenta de novo sozinho." };
    case "QUALITY_CHANGE":
      if (!bad) return { urgency: "INFO", meaning: "A qualidade do número melhorou.", action: "Nada." };
      return a.severity === "CRITICAL"
        ? { urgency: "URGENTE", meaning: "A qualidade do número ficou VERMELHA: muita gente bloqueando ou denunciando. Se continuar, a Meta corta o limite ou bane.", action: "Pare de disparar com esse número por 1 ou 2 dias e revise o template e a lista. O Fuzil já tira números vermelhos das campanhas (se a opção estiver ligada)." }
        : { urgency: "ATENCAO", meaning: "A qualidade do número caiu para AMARELA.", action: "Diminua o volume nesse número e confira se o template não está parecendo propaganda." };
    case "NUMBER_STATUS":
      return bad
        ? { urgency: "URGENTE", meaning: "O número foi sinalizado, restringido, banido ou desconectado pela Meta.", action: "Ele já não é usado nos disparos. Veja o motivo no Gerenciador do WhatsApp dessa BM e peça revisão se achar injusto." }
        : { urgency: "INFO", meaning: "O status do número mudou para normal.", action: "Nada." };
    case "ACCOUNT_UPDATE":
      return bad
        ? { urgency: "URGENTE", meaning: "A Meta aplicou uma restrição, violação ou banimento nessa conta do WhatsApp.", action: "Abra o Gerenciador do WhatsApp dessa BM, veja a violação e peça revisão. Use outras BMs enquanto isso." }
        : { urgency: "INFO", meaning: "A Meta mandou uma atualização da conta (ex.: verificação ou revisão concluída).", action: "Nada, só para registro." };
    case "SYNC_ERROR":
      if (/webhook/i.test(a.title)) return { urgency: "ATENCAO", meaning: "O Fuzil não conseguiu se inscrever para receber os eventos dessa BM (entregas, leituras, respostas).", action: "Ele tenta de novo sozinho a cada 10 min. Se continuar, reconecte a BM em Conexões." };
      return byCode ?? { urgency: "ATENCAO", meaning: "O Fuzil não conseguiu atualizar os dados dessa BM na Meta.", action: "Ele tenta de novo sozinho a cada 10 min. Se continuar por mais de 1 hora, reconecte a BM em Conexões." };
    case "BM_LIMIT_FULL":
      return { urgency: "INFO", meaning: "A BM usou todo o limite de 24h. Ela volta a enviar quando o limite liberar.", action: "Nada. As campanhas usam as outras BMs do grupo ou esperam." };
    case "BM_LIMIT_RELEASED":
      return { urgency: "INFO", meaning: "O limite da BM liberou e ela já pode disparar de novo.", action: "Nada." };
    case "LIMIT_CHANGE":
      return bad
        ? { urgency: "ATENCAO", meaning: "A Meta DIMINUIU o limite diário dessa BM (geralmente por qualidade baixa).", action: "Cuide da qualidade dos números dessa BM; o limite volta a subir com o tempo." }
        : { urgency: "INFO", meaning: "A Meta AUMENTOU o limite diário dessa BM.", action: "Nada. Mais disparos disponíveis por dia." };
  }
  if (byCode) return byCode;
  return a.severity === "CRITICAL"
    ? { urgency: "URGENTE", meaning: "Aconteceu algo grave nessa conta.", action: "Leia a mensagem acima e confira no painel em Alertas." }
    : a.severity === "WARNING"
      ? { urgency: "ATENCAO", meaning: "Algo precisa da sua atenção.", action: "Confira no painel em Alertas." }
      : { urgency: "INFO", meaning: "Aviso informativo.", action: "Nada." };
}

// ---------------------------------------------------------------------------
// Erros do sistema (canal #erros)
// ---------------------------------------------------------------------------

export function explainSystemError(source: string, message: string, detail = ""): Explanation {
  const text = `${message}\n${detail}`;
  const where = source === "worker" ? "no motor de disparo" : source === "webhook" ? "ao receber um evento da Meta" : "no site";

  if (/Can't reach database|ECONNREFUSED.*5432|database server|P1001|P1017|connection pool/i.test(text))
    return { urgency: "URGENTE", meaning: "O banco de dados ficou fora do ar ou não respondeu. Enquanto isso o painel e os disparos param.", action: "Normalmente volta sozinho em 1 minuto (o servidor reinicia o banco). Se continuar por mais de 5 minutos, reinicie o servidor." };
  if (/no space left|ENOSPC/i.test(text))
    return { urgency: "URGENTE", meaning: "O disco do servidor encheu.", action: "Peça ao suporte técnico para limpar backups/logs antigos. Até lá podem falhar envios e o painel." };
  if (/out of memory|heap|ENOMEM|JavaScript heap/i.test(text))
    return { urgency: "URGENTE", meaning: "O servidor ficou sem memória.", action: "Ele reinicia sozinho. Se repetir, peça ao suporte técnico para ajustar." };
  if (/token|OAuthException|\(#190\)|code 190|Session has expired/i.test(text))
    return { urgency: "URGENTE", meaning: "O acesso à Meta expirou ou foi revogado (token inválido).", action: "Gere um token novo do System User com o seu amigo e cole em Admin → Integração." };
  if (/ENOTFOUND|EAI_AGAIN|fetch failed|ETIMEDOUT|ECONNRESET|socket hang up|TimeoutError|aborted due to timeout/i.test(text))
    return { urgency: "ATENCAO", meaning: `Falha de conexão com um serviço externo (Meta, e-mail ou Discord) ${where}.`, action: "Normalmente é instabilidade passageira e o Fuzil tenta de novo. Só se preocupe se repetir muitas vezes seguidas." };
  if (/Unique constraint|P2002/i.test(text))
    return { urgency: "INFO", meaning: "Tentaram cadastrar algo que já existia (ex.: e-mail ou nome repetido).", action: "Nada, a não ser que alguém reclame que não conseguiu salvar." };
  if (/Record to (update|delete) not found|P2025/i.test(text))
    return { urgency: "INFO", meaning: "Alguém tentou mexer em algo que já tinha sido apagado.", action: "Nada." };
  if (/Server Action .* was not found|Failed to find Server Action/i.test(text))
    return { urgency: "INFO", meaning: "Alguém estava com a página aberta de uma versão antiga do painel quando o servidor atualizou.", action: "Nada. É só a pessoa recarregar a página (F5)." };
  if (/assinatura|signature/i.test(text) && source === "webhook")
    return { urgency: "ATENCAO", meaning: "Chegou um evento da Meta que não passou na conferência de segurança.", action: "Confira se o App Secret em Admin → Integração é o mesmo do app do Tech Provider." };
  const code = metaCodeIn(text);
  const byCode = explainMetaCode(code);
  if (byCode) return byCode;
  return source === "worker"
    ? { urgency: "ATENCAO", meaning: "Um erro inesperado aconteceu no motor de disparo. Ele continua rodando e tenta de novo na próxima volta.", action: "Se repetir várias vezes ou alguma campanha parar, mande print desta mensagem para o suporte técnico." }
    : { urgency: "ATENCAO", meaning: `Um erro inesperado aconteceu ${where}. Quem estava usando viu uma tela de erro.`, action: "Se repetir, mande print desta mensagem (com o código digest) para o suporte técnico." };
}
