// Versão do Fuzil Disparador. A cada atualização: sobe o número e adiciona as novidades no topo.

export const CHANGELOG: Array<{ version: string; date: string; items: string[] }> = [
  {
    version: "1.26",
    date: "20/10/2026",
    items: [
      "Segurança: uma WABA só pode estar em uma conta do Fuzil, e o acesso é conferido na Meta antes de conectar",
      "Segurança: conexão manual exige o token da própria BM e só dono/admin da conta pode conectar",
      "Segurança: arquivos recebidos no Chat que não são imagem, áudio, vídeo ou PDF são baixados, nunca abertos no navegador",
      "Segurança: limite de tentativas no login e no \"esqueci minha senha\"; trocar senha ou e-mail desconecta os outros aparelhos",
      "Segurança: webhooks sem assinatura da Meta são recusados; conta bloqueada não manda resposta automática",
      "Mais rápido: índices novos no banco para limites, alertas, cliques e respostas",
    ],
  },
  {
    version: "1.25",
    date: "20/10/2026",
    items: [
      "Templates: os enviados pelo Fuzil antes desta versão também mostram o horário de envio",
      "Números de teste da Meta somem do Fuzil: não aparecem nas BMs, no Chat nem no rodízio (a WABA fica só com os números reais)",
      "Logo nova do Fuzil: F + UZIL com DISPARADOR embaixo no login, site e e-mails; dentro da plataforma, só o F",
      "Visual mais limpo: Grupos de BM, Templates padrão e Admin em gavetas, com bolinha de status e o resumo do lado de fora",
      "Alertas em uma linha cada (clique para ver o detalhe), Início mais enxuto e Saldo agrupando os lançamentos de cada campanha",
    ],
  },
  {
    version: "1.24",
    date: "20/10/2026",
    items: [
      "Templates padrão com contagem: se a Meta reclassificar o template como marketing numa BM, o Fuzil cria sozinho a próxima versão (fzl_disp1 → fzl_disp2 → fzl_disp3...) só nessa BM",
      "Campanhas tratam todas as versões como o mesmo template e usam em cada BM a versão aprovada",
      "Números apagados na Meta somem do Fuzil na sincronização (se tiverem conversas no Chat, o histórico fica guardado)",
      "Templates: contas da última conectada (em cima) até a primeira (embaixo), com a hora do último template enviado já na gaveta fechada",
    ],
  },
  {
    version: "1.23",
    date: "20/10/2026",
    items: [
      "Números de teste da Meta e números não registrados nunca entram no rodízio",
      "Conexões: cada conta mostra o que falta para disparar (número registrado, cartão, template aprovado e avisos da Meta) ou \"Pronta para disparar\"",
      "Disparos pulam contas sem forma de pagamento",
      "Conexões em gavetas: uma por BM, com bolinha verde (pronta), amarela (aviso) ou vermelha (falta algo)",
    ],
  },
  {
    version: "1.22",
    date: "20/10/2026",
    items: [
      "Conexão manual com app próprio da BM: templates com imagem/vídeo/PDF no cabeçalho agora são criados sem erro",
      "Templates padrão: o botão \"Aplicar agora\" tenta de novo nas contas que deram erro",
      "Templates e Templates padrão mostram a data e o horário em que o template foi enviado para a Meta em cada BM",
    ],
  },
  {
    version: "1.21",
    date: "17/10/2026",
    items: [
      "Templates: agora aparecem em gavetas, uma por conta. Clique na conta para ver os templates dela",
      "Excluir template apaga direto na Meta e avisa o motivo se a Meta recusar",
      "Templates de exemplo da Meta (hello_world, jaspers_market...) aparecem marcados e sem o botão Excluir, porque a Meta não deixa apagar",
    ],
  },
  {
    version: "1.20",
    date: "09/10/2026",
    items: [
      "Conectar Cloud API / Coexistência: compatível com a versão nova (v4) do cadastro da Meta",
      "Se a Meta demorar a informar a conta escolhida, o Fuzil espera e, se preciso, descobre a conta pelo próprio token",
    ],
  },
  {
    version: "1.19",
    date: "09/10/2026",
    items: [
      "Corrigido: horário de \"Sincronizado\" em Conexões e do gráfico das campanhas agora no horário de Brasília",
      "Corrigido: \"limite cheio\" aparecia quando a BM não tinha nenhum envio (agora diz que o limite inteiro está disponível)",
      "Configuração manual em Conexões: o navegador não preenche mais e-mail e senha nos campos de WABA e token",
    ],
  },
  {
    version: "1.18",
    date: "08/10/2026",
    items: [
      "Chat com só duas abas: Disparando (recebeu e não reagiu) e Em andamento (respondeu ou clicou no botão do disparo)",
      "Clique no link do disparo aparece dentro da conversa e leva o contato para Em andamento",
      "Finalizadas ficam no ícone de caixa ao lado das abas",
    ],
  },
  {
    version: "1.17",
    date: "08/10/2026",
    items: [
      "Novo: Chat. As respostas dos clientes chegam em tempo real, separadas por número e por grupo de BM, com abas Respondidas, Não lidas, Em atendimento, Finalizadas e Todas",
      "No Chat aparece o disparo que cada contato recebeu (com o texto que ele viu), respostas, áudios, imagens e documentos",
      "Responder pelo mesmo número: texto, anexos, respostas rápidas (/atalho) e marcação de lida (tracinhos azuis para o cliente)",
      "Janela de 24h com relógio. Fora dela, envio de template (inclusive com imagem no cabeçalho e link no botão)",
      "Nova conversa com qualquer número, começando por template",
      "Resposta automática por campanha: quando o cliente responde o disparo, recebe na hora uma mensagem (com anexo opcional), uma vez por contato. Quem manda SAIR não recebe",
      "Tutorial do Chat na aba Tutoriais",
    ],
  },
  {
    version: "1.16",
    date: "08/10/2026",
    items: ["Barras de rolagem finas na paleta do Fuzil: no menu lateral fica escura e discreta, laranja ao passar o mouse"],
  },
  {
    version: "1.15",
    date: "08/10/2026",
    items: ["Corrigido: HTTPS dos domínios (site, painel e links) depois da atualização anterior do servidor"],
  },
  {
    version: "1.14",
    date: "08/10/2026",
    items: [
      "Site também em site.fuzildisparador.com.br",
      "Admin → Empresa e site: aceita códigos de verificação de domínio de mais de uma BM (separados por vírgula)",
    ],
  },
  {
    version: "1.13",
    date: "08/10/2026",
    items: [
      "Corrigido: botões de salvar do Admin (Empresa e site, Integração, Discord, Criar conta) ficavam presos em \"Aguarde...\" ou davam erro na tela",
      "Se o painel for atualizado com a página aberta, aparece \"O painel foi atualizado\" e ele recarrega sozinho, em vez da tela de erro",
    ],
  },
  {
    version: "1.12",
    date: "08/10/2026",
    items: ["Site: título agora é \"Mensagens pela API oficial em escala\" e não fala mais de utilidade/marketing (isso fica só no painel)"],
  },
  {
    version: "1.11",
    date: "08/10/2026",
    items: [
      "Site público em fuzildisparador.com.br: página de vendas, Política de Privacidade, Termos de Uso e Exclusão de dados (exigidos pela Meta para o app do Tech Provider)",
      "Admin → Empresa e site: razão social, CNPJ, endereço, e-mail, telefone e código de verificação de domínio da Meta",
    ],
  },
  {
    version: "1.10",
    date: "08/10/2026",
    items: [
      "Corrigido: bug reportado não ia pro Discord quando não existia canal #bugs nem #geral. Agora tenta #bugs → #geral → #erros → qualquer canal configurado",
      "Admin → Bugs reportados mostra se cada relato chegou no Discord (e o motivo, se não chegou), com botão \"Reenviar pro Discord\"",
      "Admin → Avisos no Discord mostra quais canais estão configurados e avisa quando nada está indo pro Discord",
    ],
  },
  {
    version: "1.9",
    date: "08/10/2026",
    items: ["Botão de reportar bug menor e mais discreto no canto da tela (cresce só ao passar o mouse)"],
  },
  {
    version: "1.8",
    date: "08/10/2026",
    items: [
      "Olhinho 👁 em todos os campos de senha (login, cadastro, criar senha, trocar senha e chaves do Admin) para conferir o que foi digitado",
    ],
  },
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
