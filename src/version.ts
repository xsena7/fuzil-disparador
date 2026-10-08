// Versão do Fuzil Disparador. A cada atualização: sobe o número e adiciona as novidades no topo.

export const CHANGELOG: Array<{ version: string; date: string; items: string[] }> = [
  {
    version: "1.7",
    date: "08/10/2026",
    items: [
      "Brilho do mouse agora tem o formato da setinha, encaixado em volta do ponteiro (some na mãozinha de link e no cursor de texto)",
    ],
  },
  {
    version: "1.6",
    date: "08/10/2026",
    items: [
      "Nova aba Tutoriais (menu Ajuda): passo a passo de cada tela com prints, boas práticas para não queimar BM e dúvidas frequentes",
      "Botão do bichinho 🐞 no canto da tela para o cliente reportar bug (com print opcional, até colando com Ctrl+V)",
      "Admin → Bugs reportados: lista com protocolo, quem mandou, página e print; marcar como resolvido. Também chega no Discord #bugs",
    ],
  },
  {
    version: "1.5",
    date: "08/10/2026",
    items: [
      "Discord explicado: cada aviso diz o que significa, o que fazer e se é 🔴 urgente, 🟡 atenção ou 🟢 só aviso (detalhe técnico fica embaixo, para o suporte)",
      "Canais do Discord agora ficam no Admin e recebem os avisos de todas as contas, com o nome da conta",
      "Configurações simplificada para o cliente: meus dados (nome e e-mail), trocar senha, nome da conta, alertas por e-mail e usuários. Discord e Meta só no Admin",
      "Alertas no painel mostram \"O que fazer\" nos avisos importantes",
      "Admin → Contas: o menu ⋮ não fica mais cortado (abre por cima da tela)",
      "Brilho laranja suave acompanhando o mouse",
    ],
  },
  {
    version: "1.4",
    date: "08/10/2026",
    items: [
      "Admin → Contas: painel novo com busca, filtro (ativas/bloqueadas) e páginas. Cada conta mostra dono, status, limite geral de 24h (soma de todas as BMs) e quantos disparos já fez",
      "Clicando na conta abre os usuários (com reenviar convite/excluir) e as BMs com o limite de cada uma",
      "Menu ⋮ de cada conta: entrar na conta, gerar link de login, reenviar convite, créditos, preço por mensagem, renomear, bloquear/desbloquear e excluir",
      "Conta bloqueada: o cliente vê a tela \"Conta bloqueada\" (com o motivo) e as campanhas rodando ou agendadas são pausadas",
      "Excluir conta pede para digitar o nome dela, e apaga junto os usuários que só tinham aquela conta",
    ],
  },
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
