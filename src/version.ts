// Versão do Fuzil Disparador. A cada atualização: sobe o número e adiciona as novidades no topo.

export const CHANGELOG: Array<{ version: string; date: string; items: string[] }> = [
  {
    version: "1.3",
    date: "08/10/2026",
    items: [
      "Admin → Usuários: lista de todos os usuários com status (convite pendente ou último acesso), reenviar convite com link para copiar e excluir usuário",
      "Admin → Contas: botão \"Entrar na conta\" para ver o painel de qualquer cliente, com faixa para voltar para a sua conta",
    ],
  },
  {
    version: "1.2",
    date: "08/10/2026",
    items: [
      "Webhook por WABA: ao conectar uma BM, os eventos dela vêm direto para o Fuzil sem mexer no webhook padrão do app (dá para dividir o app do Tech Provider com outro sistema)",
      "Se a inscrição do webhook falhar, o painel avisa e tenta de novo sozinho na próxima sincronização",
    ],
  },
  {
    version: "1.1",
    date: "08/10/2026",
    items: [
      "Versão do painel agora aparece como v1.1, v1.2... no rodapé do menu, com esta página de novidades",
      "Corrigido: configurações salvas no Admin (chave do Resend, Meta, Discord) sumiam quando o servidor reiniciava",
    ],
  },
  {
    version: "1.0",
    date: "08/10/2026",
    items: [
      "Lançamento: conexões de BMs, grupos de BM, templates e templates padrão, campanhas com distribuição entre números",
      "Trava anti-marketing, redirecionador de links com contagem de cliques e relatório completo das campanhas",
      "Nova identidade visual (logo AK-47 FUZIL) e painel redesenhado",
      "Limite de 24h de cada BM com contagem regressiva e avisos de limite atingido/liberado",
      "Pastas de campanhas e exclusão direto pela lista",
      "E-mails com o layout do Fuzil: convite de cliente, esqueci minha senha e alertas críticos",
      "Avisos no Discord por canal (campanhas, templates, qualidade, limites, geral), canal de erros e Admin → Logs",
    ],
  },
];

export const APP_VERSION = CHANGELOG[0].version;
