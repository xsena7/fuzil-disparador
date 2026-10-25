// Conteúdo da área de Tutoriais (para o cliente se virar sozinho).
// Os prints ficam em public/tutoriais/*.png (gerados com dados de exemplo).

export type TutorialBlock =
  | { kind: "text"; text: string }
  | { kind: "steps"; items: string[] }
  | { kind: "tip"; text: string }
  | { kind: "warn"; text: string }
  | { kind: "image"; src: string; caption: string };

export type Tutorial = {
  slug: string;
  title: string;
  summary: string;
  icon: "rocket" | "flame" | "key" | "building" | "layers" | "file" | "sparkles" | "megaphone" | "chart" | "chat" | "bell" | "coins" | "settings" | "shield" | "help";
  /** Página do painel a que o tutorial se refere */
  href?: string;
  minutes: number;
  blocks: TutorialBlock[];
};

export const TUTORIALS: Tutorial[] = [
  {
    slug: "primeiros-passos",
    title: "Primeiros passos",
    summary: "O caminho completo, do zero até a primeira campanha disparada.",
    icon: "rocket",
    href: "/",
    minutes: 3,
    blocks: [
      { kind: "text", text: "O Fuzil Disparador envia mensagens de WhatsApp em massa pela API oficial da Meta, sempre com templates de UTILIDADE, distribuindo os envios entre vários números de várias BMs. A ordem para começar é sempre esta:" },
      {
        kind: "steps",
        items: [
          "Conexões: conecte suas BMs (Business Managers) do WhatsApp. É só pedir acesso ao app do Fuzil, gerar o token do usuário do sistema e colar com o ID da WABA (veja o tutorial \"Conectar pelo token\").",
          "Grupos de BM: junte as BMs em um grupo. A campanha dispara pelo grupo, usando todos os números dele.",
          "Templates: crie (ou puxe) um template de Utilidade e espere a Meta aprovar.",
          "Saldo: confira se a conta tem créditos. Cada mensagem enviada consome créditos.",
          "Campanhas: crie a campanha, escolha o template, preencha o conteúdo, suba a planilha e dispare.",
          "Métricas e Alertas: acompanhe entregas, leituras, cliques e qualquer problema com os números.",
        ],
      },
      { kind: "tip", text: "Em Conexões, cada conta mostra em verde \"Pronta para disparar\" ou, em vermelho/amarelo, exatamente o que falta: número registrado, cartão (forma de pagamento) ou template aprovado." },
      { kind: "tip", text: "BM nova com limite baixo? Use o Aquecimento: uma página de vagas que gera conversas reais e aquece as BMs do grupo (veja o tutorial Aquecimento)." },
      { kind: "image", src: "/tutoriais/inicio.png", caption: "Tela inicial: BMs conectadas, quanto ainda dá para enviar hoje, envios e cliques das últimas 24h." },
      { kind: "tip", text: "A tela Início mostra o \"Disponível hoje\": é quanto ainda dá para disparar nas próximas 24h somando o limite só das BMs prontas para disparar (as que estão nos grupos de problema ou sem cartão, número ou template não contam)." },
    ],
  },
  {
    slug: "conexoes",
    title: "Conectar BMs",
    summary: "Como ligar suas BMs e números do WhatsApp ao painel.",
    icon: "building",
    href: "/conexoes",
    minutes: 4,
    blocks: [
      { kind: "text", text: "Cada BM (portfólio empresarial da Meta) tem uma ou mais contas do WhatsApp (WABA), e cada WABA tem números. O Fuzil puxa tudo isso sozinho e atualiza qualidade, status e limite a cada 10 minutos." },
      { kind: "image", src: "/tutoriais/conexoes.png", caption: "Conexões: cada BM com seus números, qualidade, limite de 24h e quanto falta para o limite liberar." },
      {
        kind: "steps",
        items: [
          "Na sua BM, peça acesso ao app do Fuzil, crie o usuário do sistema fuzil-api, dê acesso a ele e gere o token (passo a passo no tutorial \"Conectar pelo token\" e em Conexões → Como conectar sua BM).",
          "Em Conexões → Conectar BM, cole o ID da WABA e o token e clique em Conectar.",
          "Em alguns segundos a BM aparece na lista, com os números e templates dela.",
        ],
      },
      { kind: "tip", text: "Passo a passo completo (pedir acesso ao app do Fuzil, criar o fuzil-api, gerar o token e pegar o ID da WABA): veja o tutorial \"Conectar pelo token (app do Fuzil)\"." },
      { kind: "text", text: "A tela de Conexões tem \"Nova conexão\" em cima e as BMs embaixo, em gavetas: a última conectada fica sempre no topo. A bolinha da gaveta mostra o estado de cada BM sem precisar abrir: verde (tudo certo), amarela (atenção) ou vermelha (algo impede o disparo)." },
      {
        kind: "steps",
        items: [
          "\"Pronta para disparar\": a conta tem número registrado, forma de pagamento e template de utilidade aprovado.",
          "\"Falta isso para essa conta disparar\": a lista diz o que falta e como resolver (ex.: cadastrar o cartão no WhatsApp Manager, registrar o número, esperar o template aprovar).",
          "Números de teste da Meta são apagados sozinhos e nunca entram no rodízio. Só número de WhatsApp válido dispara.",
          "Número que você apagou na Meta some do Fuzil na próxima sincronização (ou clique em Verificar na WABA, ou em Verificar todas do lado de Suas conexões).",
        ],
      },
      { kind: "text", text: "O que cada informação significa:" },
      {
        kind: "steps",
        items: [
          "Qualidade: Verde (alta), Amarela (média) ou Vermelha (baixa). Vermelha = muita gente bloqueando/denunciando. Pare de usar esse número por um tempo.",
          "Limite (24h): quantas PESSOAS DIFERENTES a BM pode receber mensagens em 24h (250, 2 mil, 10 mil, 100 mil ou ilimitado). O limite é da BM inteira, somando os números dela.",
          "Contagem regressiva: quando a BM bate o limite, mostra quanto tempo falta para liberar de novo (a janela é de 24h corridas).",
          "Fora do rodízio: o número não é usado nos disparos (você pode tirar e colocar de volta quando quiser).",
        ],
      },
      { kind: "warn", text: "Número com qualidade Vermelha, sinalizado ou banido sai automaticamente dos disparos e você recebe um alerta." },
    ],
  },
  {
    slug: "conexao-manual",
    title: "Conectar pelo botão (Cloud API / Coexistência)",
    summary: "O jeito mais rápido: clica no botão, faz o login na Meta e a BM conecta sozinha.",
    icon: "key",
    href: "/conexoes",
    minutes: 3,
    blocks: [
      { kind: "text", text: "Esse é o caminho mais simples. Você não precisa pegar ID nem token: a própria Meta pergunta qual conta do WhatsApp conectar e o Fuzil faz o resto." },
      {
        kind: "steps",
        items: [
          "Em Conexões, no bloco \"Nova conexão\", clique em Conectar Cloud API (número novo ou dedicado à API) ou em Conectar em Coexistência (número que já usa o WhatsApp Business no celular).",
          "Vai abrir a janela da Meta. Entre com o Facebook que é administrador da BM.",
          "Escolha a BM, a conta do WhatsApp e o número, e siga as telas até o fim.",
          "Quando aparecer a tela de conclusão da Meta, clique em Concluir.",
          "Depois de clicar em Concluir, a janela da Meta fecha sozinha. Espere aparecer a mensagem \"BM conectada! 🎉\" na tela do Fuzil, com o confete. Só então ela está conectada.",
          "Clique na tela para fechar a comemoração e conectar a próxima, se tiver.",
        ],
      },
      { kind: "warn", text: "Não feche a janela da Meta antes de clicar em Concluir, e não clique de novo no botão enquanto a comemoração não aparecer. Se fechar no meio, a conexão não é concluída: é só começar de novo." },
      { kind: "text", text: "Se aparecer \"Opa, não deu certo\" depois da comemoração, abra a BM em Conexões e clique em Testar conexão: a mensagem diz o que falta (permissão, chave ou avisos da Meta)." },
      { kind: "tip", text: "Depois de conectar, mande um teste de envio pra um número seu e responda. Se a resposta aparecer no Chat, está tudo funcionando." },
    ],
  },
  {
    slug: "grupos",
    title: "Grupos de BM",
    summary: "Junte várias BMs para disparar com o limite somado.",
    icon: "layers",
    href: "/grupos",
    minutes: 2,
    blocks: [
      { kind: "text", text: "A campanha não escolhe número por número: ela dispara por um GRUPO, e os envios são distribuídos entre todos os números aptos das BMs do grupo. Assim você soma o limite de várias BMs numa campanha só." },
      { kind: "image", src: "/tutoriais/grupos.png", caption: "Cada grupo mostra o limite total, quanto está disponível agora, números ativos e a qualidade." },
      {
        kind: "steps",
        items: [
          "Em Grupos de BM, clique em \"Novo grupo\".",
          "Dê um nome (ex.: \"Disparos principais\") e marque as BMs que fazem parte.",
          "Clique em \"Criar grupo\". O painel já mostra o limite somado.",
        ],
      },
      { kind: "tip", text: "Uma BM pode estar em mais de um grupo. Se quiser separar por cliente ou por produto, crie um grupo para cada." },
      { kind: "text", text: "Cada grupo fica numa gaveta: fechada, mostra quantas BMs, números ativos e o limite disponível; aberta, mostra os números grandes e o limite de cada BM." },
      { kind: "warn", text: "Grupos automáticos de problema: 🚫 Banidas, 💳 Problemas de pagamento, 📱 Sem número, 📝 Template em análise, 📉 Número com qualidade baixa e ⚠️ BMs com problema (o que o Fuzil não identificar). A BM sai sozinha dos grupos de disparo e vai para o grupo do problema, com o motivo e como resolver, e volta sozinha quando o problema some. Sem número, sem cartão e sem template valem até para BM que nunca disparou; banida e qualidade baixa, só depois do primeiro disparo. Colocou à mão? Clique em \"Resolvido\" para ela voltar." },
    ],
  },
  {
    slug: "templates",
    title: "Templates",
    summary: "Criar templates de Utilidade, aprovação e o que fazer se virar marketing.",
    icon: "file",
    href: "/templates",
    minutes: 5,
    blocks: [
      { kind: "text", text: "Template é a mensagem pré-aprovada pela Meta. O Fuzil só dispara templates de UTILIDADE que estejam APROVADOS. Os templates de todas as suas BMs aparecem nesta lista." },
      { kind: "image", src: "/tutoriais/templates.png", caption: "Lista de templates de todas as BMs, com categoria, status e há quanto tempo foi usado." },
      {
        kind: "steps",
        items: [
          "Clique em \"Criar template\".",
          "Nome: só letras minúsculas, números e _ (ex.: lembrete_pedido_01).",
          "Escolha o idioma e em \"Onde subir\" marque as BMs/WABAs onde ele deve ser criado.",
          "Cabeçalho (opcional): texto, imagem, vídeo ou documento.",
          "Corpo: o texto da mensagem. Use {{1}}, {{2}}... para variáveis (nome, pedido etc.) e preencha um exemplo para cada uma.",
          "Botões (opcional): resposta rápida, telefone ou link. Para contar cliques, use \"Link rastreado\" (veja abaixo).",
          "Confira a pré-visualização à direita e envie. A Meta costuma aprovar em minutos.",
        ],
      },
      { kind: "image", src: "/tutoriais/template-novo.png", caption: "Criação de template com pré-visualização igual ao WhatsApp." },
      { kind: "text", text: "Link rastreado: o botão é aprovado com o link do Fuzil e, na campanha, você cola o site final. Cada pessoa recebe um link único, e o painel conta quem clicou (ignorando robôs de pré-visualização)." },
      { kind: "warn", text: "Marketing NÃO é disparado de jeito nenhum. Se a Meta mudar a categoria de um template para Marketing, os números daquela BM saem do disparo na hora e você recebe um alerta urgente. Crie outro template com texto mais \"de serviço\": aviso de pedido, lembrete, confirmação. Evite promoção, desconto, \"aproveite\", \"oferta\"." },
      { kind: "text", text: "A lista fica em gavetas por conta do WhatsApp (a última conectada em cima). Fechada, a gaveta mostra o último template enviado e quando. Aberta, mostra cada template com a data e a hora em que foi enviado para a Meta." },
      { kind: "tip", text: "Excluir: o botão de lixeira apaga o template direto na Meta (e no Fuzil). Os templates de exemplo da Meta (hello_world etc.) não têm lixeira porque a Meta não deixa apagar." },
      { kind: "tip", text: "Dicas para aprovar como Utilidade: fale de algo que a pessoa já tem (pedido, cadastro, agendamento, conta), seja direto, e não coloque preço nem chamada de venda." },
    ],
  },
  {
    slug: "templates-padrao",
    title: "Templates padrão",
    summary: "Um template que sobe sozinho em todas as BMs, até nas novas.",
    icon: "sparkles",
    href: "/templates-padrao",
    minutes: 2,
    blocks: [
      { kind: "text", text: "O template padrão é criado automaticamente em todas as BMs da conta (ou só nas de um grupo), inclusive nas que você conectar depois. O Fuzil confere a cada 5 minutos." },
      { kind: "image", src: "/tutoriais/templates-padrao.png", caption: "Templates padrão e em quantas BMs cada um já está aprovado." },
      {
        kind: "steps",
        items: [
          "Clique em \"Novo template padrão\".",
          "Monte o template igual ao de Templates.",
          "Escolha o escopo: todas as BMs da conta ou um grupo.",
          "Pronto. Ele vai sendo criado em cada BM, e a tela mostra o status de cada cópia.",
        ],
      },
      { kind: "warn", text: "Se a Meta classificar uma cópia como marketing, ela é EXCLUÍDA automaticamente daquela BM e você recebe um alerta. O Fuzil cria sozinho a próxima versão com o nome numerado (ex.: fzl_disp1 vira fzl_disp2) e as campanhas passam a usar ela. Se a Meta já criar como marketing de cara, o problema é o texto: mude o texto do template." },
      { kind: "tip", text: "\"Aplicar agora\" não manda tudo de novo: só tenta outra vez as cópias que deram erro e cria nas BMs onde ainda não existe. As que já estão enviadas ou aprovadas ficam como estão." },
      { kind: "tip", text: "Botões não podem ter emoji, quebra de linha nem formatação (regra da Meta). O Fuzil limpa isso sozinho antes de enviar." },
    ],
  },
  {
    slug: "campanhas",
    title: "Criar e disparar uma campanha",
    summary: "As 5 etapas: template, conteúdo, audiência, envio e métricas.",
    icon: "megaphone",
    href: "/campanhas",
    minutes: 6,
    blocks: [
      { kind: "image", src: "/tutoriais/campanhas.png", caption: "Lista de campanhas. Use o ⋮ para mover para uma pasta, duplicar ou excluir." },
      { kind: "text", text: "1. Criar: em Campanhas, clique em \"Nova campanha\", dê um nome e escolha o Grupo de BM." },
      { kind: "text", text: "2. Template: escolha o template. Só aparecem os aprovados como Utilidade em pelo menos uma BM do grupo. A tela mostra quais números vão disparar e quais ficam de fora (e por quê)." },
      { kind: "image", src: "/tutoriais/campanha-template.png", caption: "Etapa Template: os números que vão disparar e a capacidade das BMs." },
      { kind: "text", text: "3. Conteúdo: preencha as variáveis ({{1}}, {{2}}...) com um texto fixo ou com uma coluna da planilha (ex.: primeiro nome). Se o template tem imagem/vídeo, suba a mídia. Se o botão é link rastreado, cole a URL final completa." },
      { kind: "image", src: "/tutoriais/campanha-conteudo.png", caption: "Etapa Conteúdo com a pré-visualização da mensagem." },
      {
        kind: "steps",
        items: [
          "4. Audiência: arraste a planilha para a área pontilhada (ou clique para escolher). Aceita Excel (.xlsx), CSV, TXT e TSV. Arquivo .xls antigo, .ods ou Numbers: salve como .xlsx ou CSV antes.",
          "O Fuzil reconhece sozinho as colunas nome, telefone/celular/whatsapp e DDI. As outras colunas viram variáveis.",
          "Telefone pode vir com ou sem 55, com ou sem traço/parênteses. Números inválidos, repetidos e quem pediu para sair (SAIR) são descartados automaticamente.",
        ],
      },
      { kind: "image", src: "/tutoriais/campanha-audiencia.png", caption: "Etapa Audiência: quantos números são válidos, duplicados, inválidos ou descadastrados." },
      {
        kind: "steps",
        items: [
          "5. Envio: escolha \"Iniciar disparo agora\" ou \"Agendar envio\" (data e hora).",
          "Velocidade por número: quantas mensagens por segundo cada número envia. Na dúvida, deixe o padrão.",
          "\"Não usar números com qualidade vermelha\": deixe marcado para proteger as BMs.",
          "Confira o custo em créditos e clique para disparar.",
        ],
      },
      { kind: "image", src: "/tutoriais/campanha-envio.png", caption: "Etapa Envio: custo, capacidade das BMs e opções de segurança." },
      { kind: "tip", text: "Se o limite de 24h das BMs acabar no meio da campanha, ela NÃO para: fica \"aguardando limite\" e continua sozinha quando liberar. Se o saldo acabar, ela pausa; coloque créditos e clique em Retomar." },
      { kind: "tip", text: "Quer responder sozinho quem responder o disparo? Ative a Resposta automática na etapa Conteúdo (veja o tutorial do Chat)." },
      { kind: "text", text: "Durante o disparo dá para Pausar, Retomar ou Cancelar pela tela da campanha. Depois de concluída, use \"Reenviar falhas\" para tentar de novo quem falhou por erro temporário." },
    ],
  },
  {
    slug: "aquecimento",
    title: "Aquecimento (página de vagas)",
    summary: "Página de vagas num domínio seu, código no WhatsApp e funil com timers que aquece as BMs.",
    icon: "flame",
    href: "/aquecimento",
    minutes: 8,
    blocks: [
      { kind: "text", text: "O Aquecimento junta duas coisas: você divulga vagas de emprego e, ao mesmo tempo, aquece as BMs com conversas reais. A pessoa se inscreve na página, recebe um código no WhatsApp (disparado pelo rodízio de um grupo de BM), confirma no site e entra num funil de mensagens. Cada mensagem conta no limite das BMs e é cobrada em créditos, como nas campanhas." },
      {
        kind: "steps",
        items: [
          "Em Grupos de BM, crie um grupo só com as BMs que você quer aquecer.",
          "Em Aquecimento → Novo funil: dê um nome, um endereço e escolha o grupo. O funil já nasce com página, perguntas, mensagens e timers prontos.",
          "Os 5 templates do funil sobem sozinhos em todas as BMs do grupo: o código (Autenticação/OTP) e 4 de Utilidade (inscrição confirmada, link do cadastro, lembrete e cadastro recebido).",
          "Abra o funil e ajuste as gavetas: Vagas, Página de inscrição, Cadastro final e Domínio.",
        ],
      },
      { kind: "text", text: "Vagas: cada cargo tem título, área, nível, salário, descrição, requisitos e a quantidade de vagas (padrão 200). O site mostra quantas vagas cada cargo tem e o total no topo. Desmarque \"Aberta\" para esconder uma vaga sem apagar." },
      { kind: "text", text: "Página de inscrição: nome da empresa, títulos, textos, cor e a foto do perfil que aparece no celular de exemplo do site." },
      { kind: "text", text: "Cadastro final: são as perguntas do link que chega no WhatsApp um dia depois (idade, escolaridade, computador, internet, experiência, horário, quando pode começar). Dá para trocar, apagar e criar perguntas." },
      { kind: "text", text: "Funil: os blocos no estilo n8n. Gatilho (inscreveu / confirmou o código), Mensagem (escolha o template padrão e o que vai em cada variável), Timer (minutos, horas ou dias) e Condicional (\"só enviar se ainda não respondeu o cadastro\"). Use + Timer e + Mensagem entre os blocos e clique em Salvar funil." },
      { kind: "tip", text: "As mensagens dos passos só saem no horário escolhido (padrão 8h às 21h, horário de Brasília). O código sai na hora, sempre." },
      { kind: "text", text: "Domínio próprio (sem o nome do Fuzil):" },
      {
        kind: "steps",
        items: [
          "Compre um domínio com nome neutro (registro.br, KingHost etc.).",
          "No funil, gaveta \"Domínio, grupo, Pixel e API de Conversões\": digite o domínio e salve. O IP do servidor aparece ali.",
          "No DNS do domínio, deixe só 2 registros tipo A: nome @ (ou vazio) e nome www, os dois com esse IP. Apague registros AAAA e CNAME antigos de @ e www.",
          "Clique em \"Verificar agora\" até ficar tudo verde: domínio, www e cadeado (HTTPS). O cadeado é gerado sozinho na primeira visita.",
        ],
      },
      { kind: "warn", text: "\"Sua conexão não é particular\" com o nome de outra empresa (ex.: *.kinghost.net): o domínio ainda aponta para a empresa onde você comprou. \"Demorou muito para responder\": o DNS já está certo, mas sua internet ainda lembra do endereço antigo. Teste no celular com 4G, rode ipconfig /flushdns no Windows ou limpe em chrome://net-internals/#dns." },
      { kind: "text", text: "Pixel e API de Conversões: cole o número do Pixel e, se quiser, o token da API de Conversões (Gerenciador de Eventos → pixel → Configurações → Gerar token). Eventos enviados: PageView, Lead (enviou o formulário), CompleteRegistration (confirmou o código) e SubmitApplication (respondeu o cadastro). Navegador e servidor são contados uma vez só." },
      { kind: "tip", text: "Para testar, use \"Código de teste\" (aba Testar eventos do Gerenciador) e faça uma inscrição até o fim. Depois apague o código de teste e exclua o lead de teste." },
      { kind: "text", text: "Leads: todo mundo que se inscreveu, com a vaga escolhida e as respostas. Filtre por situação e baixe a planilha para usar numa campanha. Em cada lead: \"Tirar do funil\" (para de receber, continua na lista, dá para voltar) ou \"Excluir\" (some; se se inscrever de novo, começa do zero)." },
      { kind: "text", text: "Aquecimento das BMs: tabela com enviadas, entregues, lidas, respostas e falhas de cada BM nos últimos 7 dias. Cada mensagem sai por uma BM diferente do rodízio, e o botão \"Recebi\" incentiva a pessoa a responder, o que melhora a qualidade." },
      { kind: "warn", text: "Anúncio no Facebook/Instagram: marque a categoria especial \"Emprego\" (obrigatório para vagas) e otimize para CompleteRegistration (ou Lead no começo). Divulgue vagas de verdade: promessa enganosa reprova o anúncio e gera denúncias que derrubam a qualidade das BMs." },
    ],
  },
  {
    slug: "metricas",
    title: "Métricas e relatório",
    summary: "Entregas, leituras, cliques, respostas, falhas e exportação.",
    icon: "chart",
    href: "/campanhas",
    minutes: 3,
    blocks: [
      { kind: "image", src: "/tutoriais/campanha-metricas.png", caption: "Métricas da campanha em tempo real." },
      {
        kind: "steps",
        items: [
          "Enviadas: a Meta aceitou a mensagem.",
          "Entregues: chegou no celular da pessoa.",
          "Lidas: a pessoa abriu. Só conta quem deixa a confirmação de leitura (os \"tracinhos azuis\") ligada, então o número real é maior.",
          "Clicaram no link: pessoas únicas que clicaram no botão rastreado (robôs de pré-visualização são ignorados).",
          "Respostas: quem respondeu a mensagem. As respostas mais comuns aparecem embaixo.",
          "Descadastraram (SAIR): quem respondeu SAIR, PARAR, STOP etc. Essa pessoa não recebe mais nenhuma campanha da conta.",
          "Falhas por motivo: o erro da Meta explicado. \"Não entregue\" normalmente é número sem WhatsApp ou que bloqueou.",
          "Desempenho por número: quanto cada número enviou e entregou.",
        ],
      },
      { kind: "tip", text: "Em \"Exportar relatório (CSV)\" você baixa a lista completa com o status de cada pessoa (dá para abrir no Excel)." },
      { kind: "text", text: "Bloqueios: a Meta não informa quem bloqueou. Eles aparecem como \"não entregue\", junto com números sem WhatsApp." },
    ],
  },
  {
    slug: "chat",
    title: "Chat e resposta automática",
    summary: "Responder clientes, ver os disparos de cada contato e responder sozinho quando o cliente fala.",
    icon: "chat",
    href: "/chat",
    minutes: 4,
    blocks: [
      { kind: "text", text: "Tudo o que os clientes respondem aos seus disparos chega no Chat, em tempo real. Você responde pelo mesmo número que enviou a mensagem, e vê na conversa o disparo que a pessoa recebeu." },
      { kind: "image", src: "/tutoriais/chat.png", caption: "Chat: números à esquerda, conversas no meio, a conversa aberta e o painel do contato com os disparos que ele recebeu." },
      {
        kind: "steps",
        items: [
          "À esquerda, escolha um grupo ou um número para ver só as conversas dele (o número vermelho mostra quantas não lidas).",
          "Duas abas: \"Disparando\" mostra quem recebeu o disparo e ainda não reagiu; \"Em andamento\" mostra quem respondeu OU clicou no botão do disparo (o clique aparece na conversa). O ícone de caixa ao lado mostra as finalizadas.",
          "Abra a conversa e escreva embaixo. Enter envia, Shift+Enter quebra a linha. O clipe anexa imagem, vídeo, áudio ou PDF.",
          "Digite / para usar uma resposta rápida (cadastre as suas no raio ⚡ ao lado do campo).",
          "\"Assumir\" marca que você está atendendo. \"Finalizar\" tira a conversa da lista; se o cliente falar ou clicar de novo, ela volta sozinha.",
        ],
      },
      { kind: "warn", text: "Janela de 24h (regra da Meta): você só pode mandar mensagem livre até 24h depois da última mensagem do cliente. O relógio verde no topo da conversa mostra quanto tempo falta. Depois disso, só dá para mandar template (botão \"Enviar template\")." },
      { kind: "text", text: "Resposta automática: em cada campanha (etapa Conteúdo ou Métricas) você pode deixar uma mensagem que é enviada sozinha, na hora, quando o cliente responde ao disparo. Ela vai uma única vez por contato e pode ter imagem, vídeo, áudio ou PDF." },
      { kind: "image", src: "/tutoriais/campanha-resposta-automatica.png", caption: "Resposta automática na campanha: dá para ligar, desligar e mudar o texto a qualquer momento, até com a campanha rodando." },
      { kind: "tip", text: "Use {{primeiro_nome}} na resposta automática para chamar o cliente pelo nome. Quem responde SAIR não recebe a resposta automática e é descadastrado." },
      { kind: "warn", text: "Respostas não aparecem no Chat? Se a BM foi conectada com um app da própria BM (e não pelo app do Fuzil), cadastre a chave secreta desse app e publique o app. Pelo app do Fuzil a chave já entra sozinha (veja \"Conectar pelo token\")." },
      { kind: "tip", text: "Nova conversa: o botão laranja ao lado da busca inicia uma conversa com qualquer número, começando por um template aprovado." },
    ],
  },
  {
    slug: "alertas",
    title: "Alertas",
    summary: "O que cada aviso significa e o que fazer.",
    icon: "bell",
    href: "/alertas",
    minutes: 3,
    blocks: [
      { kind: "text", text: "Tudo de importante que acontece nas suas BMs e campanhas vira um alerta. Os novos aparecem também como notificação no canto da tela enquanto o painel está aberto, e os mais graves chegam por e-mail." },
      { kind: "image", src: "/tutoriais/alertas.png", caption: "Alertas com o que fazer em cada caso." },
      {
        kind: "steps",
        items: [
          "🔴 Template virou Marketing: pare de usar o template e crie outro de utilidade.",
          "🔴 Qualidade Vermelha / número sinalizado ou banido: o número sai dos disparos. Descanse ele 1 ou 2 dias e revise texto e lista.",
          "🔴 Campanha pausada: leia o motivo (saldo, template, nenhum número apto) e corrija antes de retomar.",
          "🟡 Número retirado da campanha: a campanha seguiu com os outros números.",
          "🔴 BM foi para um grupo de problema (Banidas, Pagamento, Sem número, Template em análise, Qualidade baixa ou BMs com problema): ela saiu dos grupos de disparo. O alerta diz o motivo e como resolver; depois clique em \"Resolvido\" em Grupos de BM.",
          "🟡 Template padrão não subiu: leia o erro. O Fuzil tenta 3 vezes; depois de corrigir, clique em \"Aplicar agora\" em Templates padrão.",
          "🟡 Limite da BM caiu: cuide da qualidade dos números dessa BM.",
          "🟢 Limite liberado, campanha concluída, template aprovado: só aviso.",
        ],
      },
      { kind: "tip", text: "Clique em \"Ativar notificações do navegador\" para receber os alertas também como notificação do navegador." },
    ],
  },
  {
    slug: "saldo",
    title: "Saldo e créditos",
    summary: "Como o saldo é consumido e estornado.",
    icon: "coins",
    href: "/saldo",
    minutes: 1,
    blocks: [
      { kind: "image", src: "/tutoriais/saldo.png", caption: "Saldo atual, custo por mensagem e todas as movimentações." },
      {
        kind: "steps",
        items: [
          "Cada mensagem enviada consome créditos (o valor por mensagem aparece em \"Custo por mensagem\").",
          "Os créditos são descontados por lote durante o disparo. O que falhar é estornado automaticamente.",
          "Se o saldo acabar no meio da campanha, ela pausa sozinha. Depois da recarga, é só clicar em Retomar.",
          "Para recarregar, fale com quem te passou o acesso ao Fuzil.",
        ],
      },
    ],
  },
  {
    slug: "configuracoes",
    title: "Configurações e usuários",
    summary: "Seus dados, senha, nome da conta e convidar pessoas.",
    icon: "settings",
    href: "/configuracoes",
    minutes: 1,
    blocks: [
      { kind: "image", src: "/tutoriais/configuracoes.png", caption: "Configurações da conta." },
      {
        kind: "steps",
        items: [
          "Meus dados: troque seu nome e e-mail de acesso (para trocar o e-mail, digite a senha atual).",
          "Trocar senha: senha atual + nova senha (mínimo de 8 caracteres).",
          "Conta: nome da conta e se quer receber os alertas críticos por e-mail.",
          "Usuários da conta: convide sua equipe. A pessoa recebe um e-mail para criar a senha.",
        ],
      },
      { kind: "tip", text: "Esqueceu a senha? Na tela de login, clique em \"Esqueci minha senha\" e receba um link por e-mail." },
    ],
  },
  {
    slug: "boas-praticas",
    title: "Boas práticas (não queimar BM)",
    summary: "Como manter a qualidade alta e o limite subindo.",
    icon: "shield",
    minutes: 3,
    blocks: [
      {
        kind: "steps",
        items: [
          "Use listas de quem já é seu cliente ou pediu contato. Lista comprada/antiga = muitos bloqueios = qualidade vermelha.",
          "Template de Utilidade de verdade: aviso, lembrete, confirmação. Nada de promoção disfarçada.",
          "Coloque o nome da pessoa ({{1}}) e algo específico dela. Mensagem genérica é denunciada mais.",
          "Comece devagar em BM nova (limite 250 ou 2 mil) e aumente aos poucos. A Meta sobe o limite sozinha quando a qualidade está boa.",
          "Deixe marcado \"Não usar números com qualidade vermelha\".",
          "Respeite o SAIR: o Fuzil já descadastra automaticamente.",
          "Distribua: quanto mais BMs no grupo, menos cada número envia e menor o risco.",
        ],
      },
      { kind: "warn", text: "Se um número ficar Vermelho, pare de usar por 1 ou 2 dias. Insistir é o caminho mais rápido para o banimento." },
    ],
  },
  {
    slug: "duvidas",
    title: "Dúvidas frequentes",
    summary: "Respostas rápidas para o que mais perguntam.",
    icon: "help",
    minutes: 2,
    blocks: [
      { kind: "text", text: "Por que minha campanha está \"aguardando limite\"? Todas as BMs do grupo bateram o limite de 24h. Ela continua sozinha quando liberar. Veja a contagem regressiva em Conexões." },
      { kind: "text", text: "Por que o template não aparece na campanha? Ele precisa estar APROVADO e como UTILIDADE em pelo menos uma BM do grupo escolhido." },
      { kind: "text", text: "Por que tantos \"não entregues\"? Números sem WhatsApp, que bloquearam o seu número ou com app muito desatualizado. Acima de 20% indica lista ruim." },
      { kind: "text", text: "As leituras parecem baixas. Normal: só contam as pessoas com confirmação de leitura ligada." },
      { kind: "text", text: "Posso mandar a mesma campanha de novo? Sim: no ⋮ da campanha, clique em Duplicar." },
      { kind: "text", text: "Meu número sumiu dos disparos. Ele pode estar com qualidade vermelha, sinalizado, sem template aprovado ou ter sido tirado do rodízio. Veja em Alertas e Conexões." },
      { kind: "text", text: "As respostas dos clientes não aparecem no Chat. Se a BM foi conectada de forma manual, falta a chave secreta do app ou publicar o app. Em Conexões, a faixa \"Receber respostas no Chat\" diz o que falta." },
      { kind: "text", text: "Minha BM sumiu do grupo. Ela deu problema e foi para o grupo automático do problema (ex.: 💳 Problemas de pagamento, 📱 Sem número) em Grupos de BM, com o motivo e como resolver. Volta sozinha quando o problema some." },
      { kind: "text", text: "O site do Aquecimento não abre. \"Conexão não é particular\" com o nome de outra empresa (ex.: kinghost): o domínio ainda aponta para onde você comprou, troque os registros A. \"Demorou muito para responder\": cache da sua internet, teste no 4G (veja o tutorial Aquecimento)." },
      { kind: "tip", text: "Encontrou algo quebrado? Clique no bichinho 🐞 no canto inferior direito da tela e conte o que aconteceu (dá para anexar um print)." },
    ],
  },
];

export function findTutorial(slug: string) {
  return TUTORIALS.find((t) => t.slug === slug);
}
