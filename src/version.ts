// Versão do Fuzil Disparador. A cada atualização: sobe o número e adiciona as novidades no topo.

export const CHANGELOG: Array<{ version: string; date: string; items: string[] }> = [
  {
    version: "1.65",
    date: "21/10/2026",
    items: [
      "Templates: a busca filtra enquanto você digita",
      "Templates: no lugar de categorias, escolha qual grupo de BM aparece",
      "Disparo: o rodízio começa por um número diferente a cada rodada, para campanhas pequenas não saírem todas pelo mesmo número",
    ],
  },
  {
    version: "1.64",
    date: "21/10/2026",
    items: ["Campanhas, métricas: saiu o gráfico \"Evolução por hora\""],
  },
  {
    version: "1.63",
    date: "21/10/2026",
    items: [
      "Correção urgente: quando a Meta avisa DEPOIS do envio que a mensagem falhou por problema da BM (pagamento, bloqueio, restrição), o Fuzil devolve a mensagem para a fila, estorna o crédito, tira o número da campanha e manda pelas outras BMs do grupo",
      "A BM com o problema vai para \"BMs com problema\" e a campanha volta a rodar se já tinha concluído",
    ],
  },
  {
    version: "1.62",
    date: "21/10/2026",
    items: ["Campanhas, métricas: botão \"Reenviar falhas\" também aparece ao lado da tabela de resultados", "Campanhas, métricas: tabela \"O que aconteceu com cada número\" mostra cada destinatário, pelo número que enviou, com o resultado e o motivo da falha"],
  },
  {
    version: "1.61",
    date: "21/10/2026",
    items: ["Teste de envio: quando a Meta recusa, mostra também se o mesmo token enxerga o template nessa conta", "Teste de envio: botão para copiar a resposta da Meta"],
  },
  {
    version: "1.60",
    date: "21/10/2026",
    items: ["Campanhas, etapa Envio: \"Teste de envio\" manda 1 mensagem para um número seu e mostra a resposta completa da Meta"],
  },
  {
    version: "1.59",
    date: "21/10/2026",
    items: ["Conexões: a tag de grupo não aparece mais nas BMs que foram usadas numa campanha de BM só"],
  },
  {
    version: "1.58",
    date: "21/10/2026",
    items: [
      "Correção: o disparo nunca mais manda um template com outro nome no lugar do escolhido. Se a BM não tem o template, ela fica de fora com o aviso",
      "Erros de template agora mostram o nome e o idioma que foram enviados",
    ],
  },
  {
    version: "1.57",
    date: "21/10/2026",
    items: ["Nova campanha: escolha se o disparo é de um grupo de BMs ou de uma BM só"],
  },
  {
    version: "1.56",
    date: "21/10/2026",
    items: ["Campanhas: dá para disparar de uma BM só (opção \"Só a BM: nome\" na etapa Template), usando os templates dela com os nomes que ela tem"],
  },
  {
    version: "1.55",
    date: "21/10/2026",
    items: ["Disparo: quando uma BM não tem o template pelo nome escolhido, mas tem aprovado um template com o mesmo texto e botões, o disparo usa esse template (sem criar nada novo)"],
  },
  {
    version: "1.53",
    date: "21/10/2026",
    items: [
      "Templates: o preview ao passar o mouse aparece logo abaixo do nome, sem ser cortado pelo cartão",
      "Campanhas, etapa Template: mostra o nome de cada BM / WABA que não está apta para o template escolhido",
      "Campanhas: etapas com mais contraste, fundo com a logo clara e brilho laranja",
    ],
  },
  {
    version: "1.52",
    date: "21/10/2026",
    items: ["A página Higienização saiu do menu. A limpeza fica na etapa Audiência da campanha: duplicados, números inválidos e quem pediu SAIR são removidos automaticamente"],
  },
  {
    version: "1.49",
    date: "21/10/2026",
    items: [
      "Higienização: nova opção \"Só o formato\", sem a Meta e sem limite, que separa os números que não têm cara de celular do WhatsApp",
      "Higienização: quando a Meta recusa a checagem, a tela mostra o motivo exato",
      "Correção: a higienização volta a compilar sem erro (o limite por vez ficou em um arquivo que roda dos dois lados)",
      "Higienização: arraste a planilha para a área pontilhada (ou clique para escolher), igual à audiência da campanha",
      "Higienização: planilha com mais de 3.000 números checa os 3.000 primeiros e gera o arquivo com os que ficaram para checar",
    ],
  },
  {
    version: "1.48",
    date: "21/10/2026",
    items: ["Correção: o motor de disparo também aplica as atualizações do banco ao subir, então o erro de coluna nova não aparece mais na virada de versão"],
  },
  {
    version: "1.47",
    date: "21/10/2026",
    items: ["Nova página Higienização: cole ou envie uma lista e veja quais números têm WhatsApp. Baixe só os válidos para limpar a lista antes de disparar"],
  },
  {
    version: "1.46",
    date: "21/10/2026",
    items: [
      "Campanhas: a velocidade agora é total (mensagens por segundo somando todos os números), com Devagar 10/s, Normal 30/s e Rápido 60/s",
      "Campanhas: a tela mostra o número de números aptos, o total de mensagens e o tempo exato até concluir, com os dias de espera entre lotes quando o limite das BMs não cabe no disparo",
    ],
  },
  {
    version: "1.45",
    date: "21/10/2026",
    items: [
      "Grupos de BM: em cada BM aparece quantos números estão ativos e, se faltar algo para disparar, o que falta",
      "Grupos de BM: números de teste da Meta e números removidos não entram mais na contagem de números do grupo",
    ],
  },
  {
    version: "1.44",
    date: "21/10/2026",
    items: [
      "Grupos de BM: cada grupo tem uma cor, que aparece na bolinha do grupo e nas etiquetas das BMs",
      "Grupos de BM: o botão para editar o nome e a cor ficou mais visível (\"✏️ Editar nome, cor e BMs\")",
    ],
  },
  {
    version: "1.43",
    date: "21/10/2026",
    items: ["Grupos de BM: nome completo da BM na lista de seleção (a etiqueta de grupo fica embaixo)"],
  },
  {
    version: "1.42",
    date: "21/10/2026",
    items: ["Grupos de BM: em cada BM da gaveta, \"Mandar para o grupo…\" move a BM para o grupo escolhido na hora. Uma BM fica em um grupo só"],
  },
  {
    version: "1.41",
    date: "21/10/2026",
    items: ["Conexões: botão \"Testar conexão\" em cada conta. Confere na Meta se o token funciona e explica o problema em português"],
  },
  {
    version: "1.40",
    date: "21/10/2026",
    items: ["Templates: passe o mouse no nome do template e aparece um preview de como a pessoa vai receber no WhatsApp"],
  },
  {
    version: "1.39",
    date: "21/10/2026",
    items: [
      "Grupos de BM: quando a BM já está em outro grupo, aparece a tag \"já está em: …\" ao escolher",
      "Grupos de BM: bolinha de cor por BM (verde = apta para disparar: cartão, número ativo e template de utilidade aprovado; vermelha = mostra o que falta)",
    ],
  },
  {
    version: "1.38",
    date: "21/10/2026",
    items: [
      "Tutoriais atualizados com todas as novidades: gavetas, o que falta para disparar, BMs com problema, templates numerados, exclusão de template, audiência em Excel",
      "Tutorial novo: Aquecimento (vagas, funil, domínio, Pixel e API de Conversões, leads)",
      "Tutorial novo: Conexão manual (app da BM), com a chave secreta e a publicação do app para o Chat receber as respostas",
    ],
  },
  {
    version: "1.37",
    date: "21/10/2026",
    items: ["Conexões manuais: ao salvar a chave secreta do app, o Fuzil liga sozinho o webhook do app da BM (URL, token e campos). Falta só publicar o app"],
  },
  {
    version: "1.36",
    date: "21/10/2026",
    items: ["Conexões manuais: mostra se as respostas estão chegando (último evento recebido) ou sendo recusadas, com o passo a passo do webhook no app da BM"],
  },
  {
    version: "1.35",
    date: "21/10/2026",
    items: [
      "Conexões manuais (app da própria BM): campo \"Chave secreta do app\". Com ela, as respostas dos contatos e os status (entregue, lido) dessas BMs aparecem no Chat",
    ],
  },
  {
    version: "1.34",
    date: "21/10/2026",
    items: ["Aquecimento: escolha a foto do perfil que aparece no celular de exemplo do site"],
  },
  {
    version: "1.33",
    date: "21/10/2026",
    items: [
      "Aquecimento: cada vaga tem \"Quantidade de vagas\" (padrão 200). O site mostra quantas vagas tem em cada cargo e o total no topo",
    ],
  },
  {
    version: "1.32",
    date: "21/10/2026",
    items: [
      "Aquecimento: \"Tirar do funil\" em cada lead. A pessoa para de receber as mensagens na hora, mas continua na lista (dá para voltar)",
      "\"Verificar agora\" também avisa se sobrou registro AAAA (IPv6) apontando para outro lugar",
      "Aquecimento: \"Excluir\" lead. Apaga a pessoa; se ela se inscrever de novo, começa do zero",
    ],
  },
  {
    version: "1.31",
    date: "21/10/2026",
    items: [
      "Aquecimento: API de Conversões da Meta. Cole o token no funil e o servidor manda Lead, CompleteRegistration e SubmitApplication direto para a Meta (sem contar em dobro com o Pixel)",
      "Mostra se o último envio para a API de Conversões deu certo ou o erro, e aceita código de teste",
    ],
  },
  {
    version: "1.30",
    date: "21/10/2026",
    items: [
      "Correção: o botão \"Recebi\" da mensagem de inscrição não tem mais emoji (a Meta recusava). As cópias que deram erro sobem de novo sozinhas",
      "Templates padrão: emoji e formatação em botões são removidos antes de enviar para a Meta",
      "\"Aplicar agora\" atualiza a tela assim que termina",
    ],
  },
  {
    version: "1.29",
    date: "21/10/2026",
    items: [
      "Aquecimento: botão \"Verificar agora\" no domínio. Mostra se o domínio e o www já apontam para o servidor e se o cadeado (HTTPS) já está funcionando"],
  },
  {
    version: "1.28",
    date: "21/10/2026",
    items: [
      "Aquecimento (novo): página de vagas num domínio seu, sem a marca do Fuzil, com as vagas em lista e inscrição em 1 minuto",
      "A pessoa recebe um código no WhatsApp disparado pelo rodízio de um grupo de BM e confirma no site",
      "Funil com blocos (gatilho, mensagem, timer e condicional) no estilo n8n: inscrição confirmada, link do cadastro, lembrete e cadastro recebido",
      "Vagas cadastradas dentro do Fuzil, e as mensagens já citam a vaga que a pessoa escolheu",
      "Leads com todas as respostas, filtro por situação e planilha para usar em campanhas",
      "Tabela de aquecimento por BM: enviadas, entregues, lidas e respostas dos últimos 7 dias",
      "Mensagens do funil só saem no horário que você escolher; o código sai na hora",
      "Cadastro final com perguntas prontas para vagas de TI/suporte: idade, escolaridade, computador, internet, experiência, horário e quando pode começar",
    ],
  },
  {
    version: "1.27",
    date: "20/10/2026",
    items: [
      "Conexões: \"Nova conexão\" fica em cima e as BMs/WABAs conectadas embaixo, a última conectada sempre no topo",
      "Logo nova (FUZIL em degradê) em todo o sistema: plataforma, login e cadastro, site, e-mails e ícone",
      "Audiência aceita Excel (.xlsx), CSV, TXT e TSV",
      "Arraste a planilha direto para a área da audiência (ou clique para escolher)",
      "Grupo automático \"⚠️ BMs com problema\": BM banida, restrita, sem pagamento, sem acesso ou com qualidade vermelha sai dos grupos de disparo e vai para lá, com o motivo e como resolver (só depois do primeiro disparo dela)",
      "Botão \"Resolvido\" devolve a BM para os grupos em que ela estava",
      "Servidor mais leve: o worker usa 3x menos memória (271 MB → 85 MB) e o painel ~120 MB a menos, com teto de memória para nunca derrubar o banco",
    ],
  },
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
      "Disparo: erro no meio do envio não perde mais o estorno nem manda a mesma mensagem duas vezes",
      "Disparo: com pouco saldo, envia o que o saldo cobre (antes travava sem enviar nada)",
      "Disparo: limite de velocidade da Meta espera antes de tentar de novo, em vez de marcar falha em segundos",
      "Disparo: problema de template numa WABA tira só essa WABA, as outras continuam",
      "Disparo: pausar ou cancelar para o envio na hora; campanha cancelada não vira mais \"concluída\"",
      "Respostas e SAIR de celulares do Brasil que a Meta manda sem o 9 agora são reconhecidos",
      "\"Reenviar falhas\" inclui as falhas por tempo esgotado/rede",
      "Chat: mensagens recebidas não somem mais da conversa aberta",
      "Celular: menu lateral vira um menu ☰ que abre e fecha, e as telas cabem na largura do telefone",
      "Botões de ação (pausar, duplicar, excluir...) travam enquanto rodam: sem clique duplo, com indicador de carregando",
      "Erros da Meta aparecem explicados em português, com o código",
      "Tela inicial, Chat e métricas da campanha pesam menos no servidor (aba escondida não fica atualizando)",
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
