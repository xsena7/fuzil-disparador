// Versão do Fuzil Disparador. A cada atualização: sobe o número e adiciona as novidades no topo.

export const CHANGELOG: Array<{ version: string; date: string; items: string[] }> = [
  {
    version: "3.42",
    date: "29/10/2026",
    items: ["Site: preço separado por caminho. Empresas com BM própria: R$ 0,01 por disparo (a taxa da Meta é à parte, no cartão da conta). Disparo pronto: a partir de R$ 0,20 por disparo, com orçamento pelo WhatsApp"],
  },
  {
    version: "3.41",
    date: "29/10/2026",
    items: ["Site: o segundo caminho agora é \"Contrate o disparo pronto\" (a gente dispara para o cliente: ele manda a lista e a mensagem e acompanha o relatório), no lugar de \"Para agências\""],
  },
  {
    version: "3.40",
    date: "29/10/2026",
    items: [
      "Site: nova página inicial para vender. Frase principal para quem não entende de BM (\"Avise milhares de clientes no WhatsApp, sem conta travando\"), um caminho para empresas e outro para agências, e preço: R$ 0,01 por disparo, sem mensalidade",
      "Site: saiu o \"em testes fechados\" e o \"Comprar BM\" do menu. A loja de BMs continua no ar só pelo link direto (/vendas)",
      "Site: seção de depoimentos pronta, aparece quando houver depoimentos reais. Mostra o total de mensagens já enviadas quando passar de 10 mil",
    ],
  },
  {
    version: "3.39",
    date: "28/10/2026",
    items: [
      "Segurança: revisão completa antes de começar a vender. Administrador da plataforma não consegue mais mexer na senha, na conta ou no usuário do dono, dos sócios e de outros administradores",
      "Segurança: Conectar com cadeado não deixa uma conta do Fuzil puxar uma conta do WhatsApp que já é (ou já foi) de outra",
      "Segurança: avisos falsos da Meta são recusados (cada chave só vale para as contas dela) e só e-mail comprovado da Meta vira BM no estoque da loja",
      "Segurança: membro comum da equipe não apaga BM, não troca token nem gasta o saldo do SMSBear/SMS24h. Adicionar alguém na equipe não revela mais quem já tem conta",
      "Segurança: proteções do servidor (cabeçalhos contra clickjacking e HTTPS forçado, limites no servidor de e-mail e na loja, bibliotecas atualizadas)",
    ],
  },
  {
    version: "3.38",
    date: "28/10/2026",
    items: ["Alertas: vermelho agora é só para o que é grave de verdade: template que virou marketing, template excluído e banimento (número, BM ou conta). BM indo para Template em análise, Pagamento ou Sem número, número tirado da campanha e afins ficam amarelos. Os alertas antigos também foram corrigidos"],
  },
  {
    version: "3.37",
    date: "28/10/2026",
    items: ["Audiência: números internacionais na planilha (ex.: 33744635335 da França, 15069625913 do Canadá) são reconhecidos mesmo sem o + na frente. Antes o Fuzil achava que eram do Brasil e marcava como inválidos"],
  },
  {
    version: "3.36",
    date: "28/10/2026",
    items: ["Números BR (SMSBear e SMS24h): registre número em várias BMs ao mesmo tempo. Marque as BMs (ou \"Marcar todas\"), confira o nome de exibição de cada uma e clique em Registrar: cada uma roda o registro automático dela em paralelo"],
  },
  {
    version: "3.35",
    date: "28/10/2026",
    items: ["Conectar contas com cadeado: quando a BM conecta, aparece a comemoração \"BM conectada! 🎉\" com confete, igual nas outras formas de conectar"],
  },
  {
    version: "3.34",
    date: "28/10/2026",
    items: [
      "Números: o número vermelho que o Fuzil tirou some de Conexões mesmo quando a Meta não deixa apagar ele da conta (fica descadastrado e escondido)",
      "BM com um número novo conectado sai de \"Sem número\", mesmo que ainda tenha um número antigo desconectado na conta",
    ],
  },
  {
    version: "3.33",
    date: "28/10/2026",
    items: ["Números: quando a qualidade de um número fica vermelha, o Fuzil tira ele da conta do WhatsApp na Meta sozinho e a BM volta para \"Sem número\", pronta para receber um número novo. Chega um aviso dizendo qual número e de qual BM"],
  },
  {
    version: "3.32",
    date: "28/10/2026",
    items: ["Chat: as mensagens do fluxo e da resposta automática não aparecem mais com a imagem e o botão do template do disparo (era só a exibição no chat: o contato recebia certo)"],
  },
  {
    version: "3.31",
    date: "28/10/2026",
    items: ["Conexões: novo \"Conectar contas com cadeado\" para todo mundo. Sem token: na conta do WhatsApp da BM, clique em Atribuir parceiro, cole o ID do Fuzil (1045096945185345) com controle total, e no Fuzil cole o ID da conta do WhatsApp. Tem o passo a passo na própria tela"],
  },
  {
    version: "3.30",
    date: "28/10/2026",
    items: [
      "Templates padrão: BM que reprovou 10 versões seguidas (ex.: fzl_disp10) volta a receber quando você edita o texto do template (mais 10 tentativas com o texto novo). Antes ela ficava travada",
      "Templates padrão: BM recém-conectada mostra \"BM nova: sobe em até 10 min\" em vez de só \"Aguardando\"",
    ],
  },
  {
    version: "3.29",
    date: "28/10/2026",
    items: ["Contas compartilhadas com o Fuzil: corrigido o erro \"Dado inválido\" ao procurar (a Meta não deixa o usuário do sistema listar as BMs dele; agora o Fuzil procura direto na BM do Fuzil) e novo campo para conectar pelo ID da conta do WhatsApp"],
  },
  {
    version: "3.28",
    date: "28/10/2026",
    items: ["Conexões (só o dono do Fuzil): \"Contas compartilhadas com o Fuzil\" lista as contas do WhatsApp que clientes compartilharam adicionando a BM do Fuzil como parceira, e conecta com um clique (sem token do cliente)"],
  },
  {
    version: "3.27",
    date: "28/10/2026",
    items: ["Conexões → Conectar manualmente: voltou o passo a passo completo, com o ID do app do Fuzil para copiar (pedir acesso na BM), o botão de pedir aprovação no WhatsApp e o nome fuzil-api do usuário do sistema"],
  },
  {
    version: "3.26",
    date: "28/10/2026",
    items: ["Conexões: voltou a opção \"Conectar manualmente\", com o token do usuário do sistema da BM (o ID da conta do WhatsApp é opcional: sem ele, o Fuzil conecta todas as contas que o token enxerga). O botão de conexão da Meta continua igual"],
  },
  {
    version: "3.25",
    date: "28/10/2026",
    items: [
      "Templates padrão: corrigido o template reprovado que não era apagado e reenviado. Quando a BM saía de \"Prontas para disparo\" (por estar sem template aprovado, sem número ou com problema de pagamento), o Fuzil parava de mandar template para ela. Agora o template padrão continua indo para todas as BMs da conta (menos as banidas), e o reprovado é apagado e reenviado com o próximo nome (ex.: fzl_disp1 → fzl_disp2)",
    ],
  },
  {
    version: "3.24",
    date: "28/10/2026",
    items: [
      "Erros da Meta em português simples em todo o Fuzil: o que aconteceu e o que fazer, sem termo técnico (disparo, teste de envio, chat, conexões, templates, números, perfil e planilha de resultados)",
      "Métricas: em \"Falhas por motivo\", cada motivo vem com a explicação embaixo",
      "Motivos de reprovação de template explicados (ex.: \"A Meta achou o texto promocional\")",
    ],
  },
  {
    version: "3.23",
    date: "28/10/2026",
    items: ["Fluxos: o bloco Disparo mostra o template da campanha escolhida já preenchido do jeito que a campanha manda (variáveis, imagem do cabeçalho e botões), no bloco e na prévia de celular ao lado"],
  },
  {
    version: "3.22",
    date: "28/10/2026",
    items: [
      "Fluxos: os blocos ficam na direita, cada um com a explicação do que faz e um exemplo. Arraste para o quadro ou clique para adicionar",
      "Fluxos: o primeiro bloco agora é o Disparo: escolha ali a campanha que começa o fluxo (dá para ter mais de uma). Se o template tiver botões de resposta, um clique já cria um caminho para cada botão",
    ],
  },
  {
    version: "3.21",
    date: "28/10/2026",
    items: [
      "Gerador de links: agora cada pessoa cria a própria conta com e-mail e senha (com \"Esqueci minha senha\" por e-mail) e vê só os links dela. O login por código no WhatsApp saiu",
      "Admin: lista das contas do gerador de links (com quantos links cada uma tem e o último acesso) e botão para bloquear uma conta",
    ],
  },
  {
    version: "3.20",
    date: "28/10/2026",
    items: [
      "Novo: Fluxos. Monte a conversa em blocos ligados por setas: Mensagem (texto, foto, áudio, vídeo ou PDF), Botões (até 3, cada um com o seu caminho), Esperar e Condição pela resposta. Quem responde o disparo segue o caminho do botão que clicou ou do que escreveu",
      "Campanhas: na etapa Conteúdo, escolha o fluxo da campanha (com fluxo ligado, a resposta automática não vai). No chat, as mensagens do fluxo aparecem com a etiqueta Fluxo",
      "O Aquecimento (página de vagas) saiu da plataforma. O login por WhatsApp do gerador de links continua e agora é ligado em Admin",
    ],
  },
  {
    version: "3.19",
    date: "28/10/2026",
    items: [
      "Chat: as mensagens que você manda (disparo, resposta automática e as suas) ficam com o fundo laranja do Fuzil e letra branca. Fundo da conversa num tom quente e letras maiores na lista",
      "Chat: na coluna de números, escolha \"Por campanha\" (os números agrupados pela campanha que disparou por eles, com a bolinha verde na que está disparando agora) ou \"Por BM\"",
    ],
  },
  {
    version: "3.18",
    date: "28/10/2026",
    items: ["Templates: as contas ficam separadas em gavetas pelo grupo da BM (Prontas para disparo, grupos de problema, seus grupos e Sem grupo), igual em Conexões, com quantas contas, templates e aptos tem em cada"],
  },
  {
    version: "3.17",
    date: "27/10/2026",
    items: ["Relatório do cliente: o quadro \"Números do relatório\" mostra a etiqueta \"só administradores veem\" (contas de clientes não veem nem conseguem mudar esses números)"],
  },
  {
    version: "3.16",
    date: "27/10/2026",
    items: [
      "Início: conta nova mostra os \"Primeiros passos\" (conectar a BM, colocar créditos, ter um template aprovado e criar a primeira campanha), com o próximo passo em destaque. Some sozinho quando tudo estiver feito",
      "Conexões: conta sem BM não mostra mais a gaveta \"Prontas para disparo\" vazia, e o aviso de conexão pelo botão não manda mais para uma configuração manual que não existe",
    ],
  },
  {
    version: "3.15",
    date: "27/10/2026",
    items: ["Chat: no disparo rápido a lista não some mais nem recarrega do zero. Os contatos entram um por um no topo e os antigos vão descendo, como uma esteira"],
  },
  {
    version: "3.14",
    date: "27/10/2026",
    items: ["Conexões: botão \"Pagamento na Meta\" em cada conta do WhatsApp, que abre direto a página de cartão daquela conta na Meta (fica laranja, \"Colocar cartão na Meta\", quando a conta está sem cartão). Precisa estar logado com um perfil administrador da BM"],
  },
  {
    version: "3.13",
    date: "27/10/2026",
    items: ["Números BR: em \"Registrar na WABA\" aparecem só as BMs do grupo \"Sem número\""],
  },
  {
    version: "3.12",
    date: "27/10/2026",
    items: [
      "Grupos: fica só o \"Prontas para disparo\" automático. Grupo de prontas criado à mão é juntado nele e apagado (as campanhas, aquecimentos e templates que usavam o manual passam a usar o automático)",
      "Grupos: o automático aparece em primeiro, com a etiqueta \"Automático\", e não dá para editar nem excluir. Em Conexões a gaveta dele aparece sempre, mesmo vazia",
    ],
  },
  {
    version: "3.11",
    date: "27/10/2026",
    items: ["Avisos no canto da tela: as atualizações de conta da Meta aparecem traduzidas e curtas (ex.: \"Parceiro adicionado\", \"Conta verificada\", \"Violação na conta\") com o nome da BM embaixo. Título comprido usa duas linhas em vez de ser cortado"],
  },
  {
    version: "3.10",
    date: "27/10/2026",
    items: [
      "Templates padrão: quando a Meta pausa ou desativa um template, o Fuzil manda sozinho a próxima versão para análise (fzl_disp2, fzl_disp3...), igual ao rejeitado. O pausado não é apagado, porque a Meta pode despausar",
      "Templates padrão: template pausado aparece como \"Pausado pela Meta: enviando outro\" (antes aparecia como \"Em análise\")",
    ],
  },
  {
    version: "3.09",
    date: "27/10/2026",
    items: ["Avisos no canto da tela: mais limpos e curtos. Só o que aconteceu (ex.: \"Sem número\") e de quem, com uma bolinha de cor. Avisos iguais chegam juntos num só (\"Sem número (2)\")"],
  },
  {
    version: "3.08",
    date: "27/10/2026",
    items: ["Conexões: número +1 (dos EUA) é tratado como número de teste da Meta, mesmo sem 555 (ex.: +1 711-670-0424). Ele não conta como número da BM, então ela fica em \"Sem número\" (que vem antes de Pagamento) até ter um número do Brasil"],
  },
  {
    version: "3.07",
    date: "27/10/2026",
    items: ["Conexões: as BMs ficam separadas em gavetas pelo grupo em que estão (Prontas para disparo, grupos de problema, seus grupos e Sem grupo), com a quantidade de BMs em cada. Abra a gaveta para ver as BMs daquela situação"],
  },
  {
    version: "3.06",
    date: "27/10/2026",
    items: [
      "Conexões: o painel de números (SMSBear/SMS24h) agora rola sozinho quando o histórico fica grande, sem passar da altura da tela",
      "Manual: botão \"Limpar os que terminaram\" tira do painel de uma vez os números cancelados ou que já receberam o código",
    ],
  },
  {
    version: "3.05",
    date: "27/10/2026",
    items: ["Conexões: o número de teste da Meta (+1 555, \"Test Number\") é reconhecido em mais formatos e nunca conta como número de verdade. A BM que só tem ele continua em \"Sem número\" e não vai mais para Pagamento por causa dele"],
  },
  {
    version: "3.04",
    date: "27/10/2026",
    items: ["SMS24h: Cancelar e Trocar número liberam na hora, sem esperar (no SMSBear continua a espera de uns 4 minutos, que é regra deles)"],
  },
  {
    version: "3.03",
    date: "27/10/2026",
    items: [
      "Conexões: o painel de números agora tem SMSBear e SMS24h (só WhatsApp Brasil). Escolha o serviço no topo; cada um conecta com a própria chave e mostra o saldo e o preço",
      "SMS24h: funciona igual ao SMSBear no Automático (compra, registra na WABA, troca de número sem SMS em 2,5 min) e no Manual (código aparece ao vivo, Cancelar/Trocar liberam 2 minutos depois da compra)",
    ],
  },
  {
    version: "3.02",
    date: "27/10/2026",
    items: [
      "Conexões: os números que sobraram de tentativas do SMSBear aparecem de novo na lista (cinza), porque eles continuam ocupando vaga na Meta. Apague no WhatsApp Manager para liberar",
      "Adicionar número: o erro diz se a Meta recusou ao colocar o número na WABA (normalmente BM no limite de números) ou ao mandar o código",
    ],
  },
  {
    version: "3.01",
    date: "27/10/2026",
    items: [
      "Conexões: o nome de exibição (e o número) não somem mais quando dá erro ao adicionar número. O nome fica guardado por WABA para a próxima vez, tanto no \"Adicionar número\" quanto no SMSBear",
    ],
  },
  {
    version: "3.00",
    date: "27/10/2026",
    items: [
      "SMSBear: modo Manual no painel. Compre o número BR, copie e coloque na BM em \"Adicionar número nesta WABA\"; quando a Meta mandar o SMS, o código aparece no painel na hora, com botão de copiar",
      "SMSBear: botões Cancelar e Trocar número em cada número. Eles ficam travados até o SMSBear liberar (uns 4 minutos depois da compra), com a contagem, e acendem sozinhos",
    ],
  },
  {
    version: "2.99",
    date: "27/10/2026",
    items: [
      "SMSBear: dá para apagar do histórico cada registro que terminou (lixeira) ou todos de uma vez (\"Limpar histórico\"). Registro com número ainda esperando cancelar fica até o saldo voltar",
      "SMSBear: os registros que terminaram ficam fechados, mostrando só a última linha (clique em \"ver tudo\" para abrir)",
      "SMSBear: corrigido o aviso falso \"já recebeu SMS\". O Fuzil continua tentando cancelar até o SMSBear devolver o saldo",
    ],
  },
  {
    version: "2.98",
    date: "27/10/2026",
    items: [
      "SMSBear: número recusado pela Meta (normalmente já banido no WhatsApp) é trocado por outro na hora, até o máximo de tentativas",
      "SMSBear: o painel mostra o cancelamento de cada número (\"cancelado: o saldo volta\" ou o que o SMSBear respondeu). O Fuzil tenta cancelar a cada 30s, porque o SMSBear só deixa alguns minutos depois da compra",
      "SMSBear: se o saldo acabar enquanto o dinheiro dos números cancelados não voltou, o registro espera o saldo voltar e continua, em vez de parar",
      "Adicionar número e SMSBear: quando a Meta recusa, aparece o motivo completo (antes vinha só \"Parâmetro inválido\" ou \"Permissão negada\")",
    ],
  },
  {
    version: "2.97",
    date: "27/10/2026",
    items: [
      "Conexões: painel do SMSBear na direita. Conecte a sua conta do SMSBear (pelo token da API) e veja o saldo e o preço do número BR para WhatsApp",
      "SMSBear: \"Registrar número automático\" na WABA que você escolher. O Fuzil compra o número, coloca na WABA, espera o código da Meta e confirma sozinho. Se o SMS não chegar em 2,5 minutos, cancela (o saldo volta) e compra outro, até dar certo ou chegar no máximo de tentativas",
      "SMSBear: cada tentativa aparece ao vivo no painel, com botão Parar. Os números que não receberam SMS somem da lista de Conexões",
    ],
  },
  {
    version: "2.96",
    date: "27/10/2026",
    items: [
      "Perfil do WhatsApp: corrigido o erro 131000 ao salvar. Campo vazio não é mais enviado (a Meta recusava), a foto vai separada do texto e é convertida para JPG quadrado 640×640 antes de enviar",
      "Perfil do WhatsApp: quando a Meta recusa, o erro mostra o motivo completo e diz se foi a foto ou o texto",
    ],
  },
  {
    version: "2.95",
    date: "27/10/2026",
    items: [
      "Conexões → Perfil do WhatsApp: trocar o nome do número pelo Fuzil. A Meta analisa o nome novo e, quando aprova, o Fuzil registra o número de novo sozinho (sem isso o nome não muda) e avisa nos Alertas. Se recusar, também avisa",
    ],
  },
  {
    version: "2.94",
    date: "27/10/2026",
    items: [
      "Conexões: botão \"Perfil do WhatsApp\" em cada número conectado. Troca a foto, o recado, a descrição, a categoria, o site, o e-mail e o endereço direto pelo Fuzil, sem entrar no Facebook",
      "Conexões: o perfil pode ser aplicado só no número, em todos os números da BM ou em todos os números da conta de uma vez",
    ],
  },
  {
    version: "2.93",
    date: "27/10/2026",
    items: [
      "Conexões: adicionar número numa WABA direto pelo Fuzil, sem entrar no perfil do Facebook. Digite o número e o nome de exibição; a Meta manda o código por SMS ou ligação, você digita o código e o Fuzil confirma e registra o número sozinho",
      "Conexões: número que ainda não foi confirmado mostra a caixa para digitar o código e os botões para pedir o código de novo",
    ],
  },
  {
    version: "2.92",
    date: "27/10/2026",
    items: [
      "Relatório do cliente: os números que você ajustou continuam subindo ao vivo junto com os reais, cada um na sua própria proporção (ex.: real 200 cliques, você colocou 2.000; o real foi a 250, o relatório mostra 2.500)",
      "Relatório do cliente: com os números ajustados, nenhum número real aparece no relatório (nem os créditos usados)",
    ],
  },
  {
    version: "2.91",
    date: "27/10/2026",
    items: ["Alertas: número banido, restrito, com qualidade alterada ou retirado de campanha agora mostra de qual BM ele é (também nos alertas antigos). O status aparece em português (ex.: Conectado → Banido)"],
  },
  {
    version: "2.90",
    date: "27/10/2026",
    items: [
      "Templates padrão: nova opção \"Não tirar as BMs prontas do disparo\". Para template extra (ex.: de um cliente para outro dia): enquanto ele está em análise, a BM que já tem outro template aprovado continua em Prontas para disparo",
      "Templates padrão: a opção também liga/desliga num template que já foi criado, e as BMs voltam para o grupo certo na hora",
      "Novo template padrão: o grupo \"Prontas para disparo\" aparece na escolha do grupo",
    ],
  },
  {
    version: "2.89",
    date: "27/10/2026",
    items: ["Financeiro: o Guilherme (dono) pode apagar qualquer lançamento, de qualquer sócio. Os outros sócios continuam apagando só os próprios"],
  },
  {
    version: "2.88",
    date: "27/10/2026",
    items: ["Financeiro: a chave Pix dos dois sócios fica sempre lá em cima, no cartão de cada um, com botão de copiar (e também na linha de reembolso do caixa)"],
  },
  {
    version: "2.87",
    date: "27/10/2026",
    items: ["Financeiro: no Acerto dá para anotar o Pix que saiu do caixa da empresa para cobrir custos, escolhendo quem recebeu (você ou o sócio). O reembolso entra na conta certa e o saldo do caixa baixa"],
  },
  {
    version: "2.86",
    date: "27/10/2026",
    items: ["Chat: os contatos do disparo aparecem ao vivo, um por um, na hora em que a mensagem sai (com um destaque laranja rápido), em vez de surgirem em lotes"],
  },
  {
    version: "2.85",
    date: "27/10/2026",
    items: ["Campanhas: o grupo \"Prontas para disparo\" voltou a aparecer na escolha do grupo (também no Aquecimento e no gerador de links)"],
  },
  {
    version: "2.84",
    date: "27/10/2026",
    items: [
      "Grupos: BM com \"envio bloqueado\" pela Meta (ex.: pagamento) não fica mais saindo e voltando do grupo de problema a cada sincronização. Ela fica parada no grupo até resolver de verdade",
      "Alertas: o mesmo aviso de \"BM foi para o grupo X\" não se repete em 24h, e os repetidos que já tinham acumulado foram apagados",
    ],
  },
  {
    version: "2.83",
    date: "27/10/2026",
    items: ["Saldo: recarga mínima de R$ 60,00 (6.000 créditos a R$ 0,01). Os pacotes começam em 6 mil"],
  },
  {
    version: "2.82",
    date: "27/10/2026",
    items: [
      "Saldo: compra de créditos pelo Pix. 1 crédito = 1 disparo, a R$ 0,01 por crédito (preço muda em Admin → Vendas). Pacotes prontos ou quantidade livre, e o saldo entra sozinho quando o Pix cai",
      "Saldo: o crédito entra uma vez só, mesmo com o Mercado Pago avisando o pagamento várias vezes. Pix não pago vence sozinho em 30 minutos e clique duplo não gera dois Pix",
      "Disparo: o crédito fica anotado em cada destinatário até a mensagem sair. O que falha ou volta para a fila é estornado numa operação só, e se o servidor cair no meio do lote o crédito volta sozinho (antes podia se perder)",
      "Financeiro: recargas de créditos e vendas de BM pagas no Pix entram sozinhas como entrada no caixa da empresa",
    ],
  },
  {
    version: "2.81",
    date: "27/10/2026",
    items: ["E-mails: cada e-mail tem uma categoria (e-mail comum, estoque geral das Vendas ou estoque de um produto), escolhida ao criar ou depois, no topo da caixa"],
  },
  {
    version: "2.80",
    date: "27/10/2026",
    items: [
      "Vendas: cada produto pode ter o seu e-mail de estoque (ex.: bm250@fuzildisparador.com.br). O convite que chegar nele entra direto nesse produto, e o e-mail aparece na gaveta do produto",
      "Vendas: botão \"Mover\" em cada BM do estoque, para trocar de produto",
    ],
  },
  {
    version: "2.79",
    date: "26/10/2026",
    items: [
      "Vendas: o cliente recebe um e-mail só (com o PDF e o link da BM), mesmo quando o Mercado Pago avisa o pagamento mais de uma vez ao mesmo tempo",
      "Vendas: o botão \"Mandar o e-mail de novo\" do pedido entregue agora reenvia de verdade",
    ],
  },
  {
    version: "2.78",
    date: "26/10/2026",
    items: ["Vendas: depois de gerar o Pix na vitrine, a página do pedido abre certinho (antes dava 404 no endereço fuzildisparador.com.br/vendas)"],
  },
  {
    version: "2.77",
    date: "26/10/2026",
    items: [
      "Vendas: convite que o Facebook não deixa testar sem login (responde 400) continua à venda. Só sai da vitrine o convite que o teste provar que não funciona (expirado ou inexistente)",
      "Vendas: convites lidos com o nome errado são corrigidos sozinhos, junto com o nome da BM no estoque (ex.: \"participar do portfólio empresarial...\" vira só o nome da BM)",
    ],
  },
  {
    version: "2.76",
    date: "26/10/2026",
    items: [
      "Vendas: o estoque se monta sozinho. Chegou convite no e-mail do estoque, o Fuzil lê o nome da BM e o link do botão do convite, testa o link e coloca a BM no estoque (com template, se ela estiver conectada no Fuzil com template aprovado; senão, sem template)",
      "Vendas: o leitor entende o e-mail atual da Meta (\"portfólio empresarial ...\" e o botão \"Faça login para ver o convite\"), e os convites que já tinham chegado são lidos de novo",
    ],
  },
  {
    version: "2.75",
    date: "26/10/2026",
    items: ["Admin → Vendas: botão \"Testar o Mercado Pago\" gera um Pix de R$ 1,00 e cancela na hora, para conferir se o token funciona"],
  },
  {
    version: "2.74",
    date: "26/10/2026",
    items: [
      "Vendas: passo a passo clicável no topo (Mercado Pago, e-mail do estoque, produto, BMs e convites), com o que já está feito e um botão que leva direto para o que falta",
      "Vendas: dá para criar o produto ali mesmo no Estoque, e os números do topo levam para a aba certa",
    ],
  },
  {
    version: "2.73",
    date: "26/10/2026",
    items: ["E-mails: o servidor de e-mail do Fuzil passa a rodar no servidor (porta 25 liberada na VM). Os e-mails chegam assim que o DNS do domínio apontar para o Fuzil"],
  },
  {
    version: "2.72",
    date: "26/10/2026",
    items: [
      "E-mails: aba nova em Plataforma (só os sócios) para criar endereços @fuzildisparador.com.br, ler, responder e baixar anexos, com contador de não lidos no menu",
      "E-mails: o conteúdo do e-mail abre isolado (nenhum script de quem mandou roda no Fuzil) e os anexos só abrem logado",
      "Vendas: o e-mail do estoque agora é uma caixa do próprio Fuzil (marque \"e-mail do estoque\" em E-mails). Os convites de BM caem direto nas Vendas, sem senha de outro provedor",
    ],
  },
  {
    version: "2.71",
    date: "26/10/2026",
    items: ["Admin: as configurações de vendas (Mercado Pago, e-mail do estoque e WhatsApp) ficam numa gaveta própria, \"Vendas\""],
  },
  {
    version: "2.70",
    date: "26/10/2026",
    items: [
      "Vendas: vitrine pública em fuzildisparador.com.br/vendas, com BMs por tipo (com ou sem template), estoque ao vivo e o template aparecendo ao passar o mouse",
      "Vendas: pagamento no Pix pelo Mercado Pago. A BM fica separada por 15 minutos e, quando o Pix cai, o cliente recebe sozinho no e-mail o convite de cada BM, o acesso ao Fuzil (conta criada sozinha) e um PDF ensinando a disparar e a usar o gerador de links",
      "Vendas: o Fuzil lê o e-mail do estoque, acha os convites das BMs, testa se o link responde e liga cada convite à BM certa pelo nome. Só BM com convite testado aparece na vitrine",
      "Vendas: painel só dos sócios com pedidos, estoque, convites recebidos e produtos, com troca de BM (garantia de 24h: convite que não funciona ou conta banida) e botão de WhatsApp para o cliente",
    ],
  },
  {
    version: "2.69",
    date: "26/10/2026",
    items: [
      "Agendamento: a data e a hora são sempre de Brasília, mesmo se o computador estiver em outro fuso, e a tela mostra por extenso quando vai começar",
      "Agendamento: horário que já passou é recusado (antes disparava na hora sem avisar)",
      "Agendamento: campanha agendada que foi pausada volta a esperar o horário quando retoma (antes disparava na hora)",
    ],
  },
  {
    version: "2.68",
    date: "26/10/2026",
    items: [
      "Financeiro: caixa da empresa. Despesa e entrada podem ser do caixa (padrão) e o lucro fica nele para reinvestir, sem ir para a conta de ninguém",
      "Financeiro: quem pagar algo do próprio bolso é reembolsado pelo caixa (botão \"Já recebi do caixa\"). Só o que o caixa não cobre é dividido meio a meio",
    ],
  },
  {
    version: "2.67",
    date: "26/10/2026",
    items: ["Grupos: \"Prontas para disparo\" fica fixo em toda conta, como o Aquecimento, mesmo sem nenhuma BM pronta ainda"],
  },
  {
    version: "2.66",
    date: "26/10/2026",
    items: ["Grupos: \"Prontas para disparo\" voltou a aparecer na lista (automático: as BMs entram e saem sozinhas)"],
  },
  {
    version: "2.65",
    date: "26/10/2026",
    items: ["Grupos: \"Prontas para disparo\" é automático. A BM apta (cartão, número ativo e template aprovado) entra sozinha a cada sincronização, e sai quando deixa de estar pronta"],
  },
  {
    version: "2.64",
    date: "25/10/2026",
    items: ["Conexões: só a conexão pelo botão (Cloud API ou Coexistência). Saiu o formulário de ID da WABA e token, e o tutorial agora ensina o passo a passo do botão"],
  },
  {
    version: "2.63",
    date: "25/10/2026",
    items: ["Conexões: \"Verificar todas\" voltou a rodar em paralelo no servidor (lotes de 6 contas), bem mais rápido"],
  },
  {
    version: "2.62",
    date: "25/10/2026",
    items: ["Conexões: \"Verificar todas\" (e \"Sincronizar tudo\") mostra um carregamento no meio da tela com a % de contas verificadas e um som de carregamento, até terminar"],
  },
  {
    version: "2.61",
    date: "25/10/2026",
    items: ["Conexões: a gaveta \"Receber respostas no Chat\" começa sempre fechada (o estado aparece na linha de resumo)"],
  },
  {
    version: "2.60",
    date: "25/10/2026",
    items: ["Código 131031 da Meta não marca mais a BM como \"conta bloqueada/restrita\" nem a manda para Banidas: é só \"a Meta recusou o envio\", e o motivo real aparece no Gerenciador do WhatsApp"],
  },
  {
    version: "2.59",
    date: "25/10/2026",
    items: [
      "Templates padrão: rejeitado é apagado na Meta e reenviado sozinho com o próximo nome, tudo de uma vez",
      "BM recém-conectada: espera 5 minutos antes de mandar os templates padrão",
    ],
  },
  {
    version: "2.58",
    date: "25/10/2026",
    items: ["Sons de conexão: o áudio é liberado antes de tocar, pra o som de falha e de sucesso não ficarem mudos em alguns navegadores"],
  },
  {
    version: "2.57",
    date: "25/10/2026",
    items: ["Conexões: se a conexão pelo botão falhar, toca o som de \"game over\" de videogame (e a tela libera)"],
  },
  {
    version: "2.56",
    date: "25/10/2026",
    items: ["Conexões: enquanto a BM está conectando pelo botão, a tela fica travada com um carregamento (\"Conectando sua BM...\"), e só libera quando termina"],
  },
  {
    version: "2.55",
    date: "25/10/2026",
    items: ["Grupos: 📱 Sem número agora vem antes de 💳 Problemas de pagamento, na checagem e na ordem da tela (banidas > template > sem número > pagamento > qualidade > desconhecido)"],
  },
  {
    version: "2.54",
    date: "25/10/2026",
    items: ["Grupos automáticos na ordem certa: 🚫 Banidas, 📝 Template em análise, 💳 Problemas de pagamento, 📱 Sem número, 📉 Qualidade baixa e ⚠️ BMs com problema"],
  },
  {
    version: "2.53",
    date: "25/10/2026",
    items: ["Grupos: o aviso genérico de \"envio bloqueado\" da Meta não passa mais na frente da checagem de template (a BM com template em análise vai para 📝 Template em análise)"],
  },
  {
    version: "2.52",
    date: "25/10/2026",
    items: ["Grupos: a ordem fica assim: 1) banida → 🚫 Banidas; 2) template padrão do Fuzil em análise → 📝 Template em análise; 3) sem template aprovado → 📝; 4) sem cartão → 💳; 5) sem número → 📱. Só conta os templates do Fuzil"],
  },
  {
    version: "2.51",
    date: "25/10/2026",
    items: ["Grupos: BM sem cartão só vai para 💳 Problemas de pagamento quando a Meta confirma que não há forma de pagamento (antes, se a Meta não informava o cartão, a BM caía lá por engano)"],
  },
  {
    version: "2.50",
    date: "25/10/2026",
    items: ["Grupos: 🚫 Banidas só recebe BM realmente banida pela Meta (erro 141014 ou número banido/restrito). Bloqueio de envio por pagamento deixou de ser tratado como banimento"],
  },
  {
    version: "2.49",
    date: "25/10/2026",
    items: ["Grupos: a conta banida pela Meta (erro \"The WABA is banned\") agora é detectada no Verificar todas e a BM vai para 🚫 Banidas"],
  },
  {
    version: "2.48",
    date: "25/10/2026",
    items: ["Grupos: 🚫 Banidas é prioridade máxima. Se uma BM for banida (número ou conta) em qualquer outro processo, ela sai de qualquer grupo, inclusive dos colocados à mão, e vai para Banidas"],
  },
  {
    version: "2.47",
    date: "25/10/2026",
    items: ["Grupos: número banido ou restrito volta a ir para 🚫 Banidas (antes a prioridade de template tirava a BM desse grupo)"],
  },
  {
    version: "2.46",
    date: "25/10/2026",
    items: ["Templates padrão: ao conectar uma BM, o Fuzil envia os templates para a Meta devagar (um por vez, com pausa de 20 segundos e no máximo 6 por rodada), em vez de todos de uma vez. O restante sai nas próximas verificações"],
  },
  {
    version: "2.45",
    date: "25/10/2026",
    items: ["Grupos: BM com template em análise vai para 📝 Template em análise mesmo que já tenha outro template aprovado. Ao aprovar, confere cartão e número sozinha"],
  },
  {
    version: "2.44",
    date: "25/10/2026",
    items: ["Grupos: template em análise agora é a prioridade (a BM vai primeiro para 📝 Template em análise). Quando o template é aprovado, o Fuzil confere cartão e número: se faltar algo, a BM vai para 💳 Problemas de pagamento ou 📱 Sem número; se estiver tudo certo, volta para as prontas para disparo"],
  },
  {
    version: "2.43",
    date: "25/10/2026",
    items: ["Tutorial atualizado: como conectar BM pelo botão Cloud API / Coexistência, e o que esperar depois de clicar em Concluir (a comemoração \"BM conectada\")"],
  },
  {
    version: "2.42",
    date: "25/10/2026",
    items: ["Conexões: o Testar conexão não exige mais a permissão business_management (não é usada para enviar). Corrige o falso aviso de permissão em BMs conectadas pelo botão"],
  },
  {
    version: "2.41",
    date: "25/10/2026",
    items: ["Conexões: ao conectar BM pelo botão Cloud API / Coexistência, aparece a comemoração com confete e som, e ela fica na tela até você clicar (pra fechar e conectar a próxima)"],
  },
  {
    version: "2.40",
    date: "25/10/2026",
    items: ["Conexões: volta o botão Conectar Cloud API / Coexistência (app verificado). BMs que já estão conectadas pelo app antigo não são trocadas: continuam com o token e a chave delas"],
  },
  {
    version: "2.39",
    date: "25/10/2026",
    items: [
      "Aquecimento: sem BM apta, a campanha do funil não fica mais pausando e voltando sem parar. Ela continua ligada como \"Aguardando BM apta\", manda sozinha quando alguma BM ficar pronta e avisa no máximo uma vez por dia",
      "Correção: campanha do aquecimento pausada à mão continua pausada (antes voltava sozinha em 5 minutos)",
    ],
  },
  {
    version: "2.38",
    date: "24/10/2026",
    items: ["Conexões: comemoração com confete e som de \"subiu de nível\" estilo videogame 8 bits quando uma BM é conectada 🎉"],
  },
  {
    version: "2.37",
    date: "24/10/2026",
    items: [
      "Financeiro: cada sócio cadastra a própria chave Pix e, na hora do acerto, aparece o botão \"Copiar chave Pix\" do outro",
      "Financeiro mais seguro: os sócios ficam fixos (dar administrador para alguém não muda a divisão nem o histórico), valor com ponto de milhar lido certo (1.234 = mil duzentos e trinta e quatro) e o acerto nunca é anotado em dobro (clique duplo, duas abas ou os dois clicando juntos)",
    ],
  },
  {
    version: "2.36",
    date: "24/10/2026",
    items: [
      "Financeiro (só os sócios, administradores do Fuzil): anote despesas, entradas e acertos com descrição, valor, categoria e comprovante. Quem anota é quem pagou ou recebeu, e a data é a da hora",
      "O Fuzil soma tudo, divide meio a meio e mostra quem passa quanto para quem. Quem deve tem o botão \"Já fiz o Pix\" (com opção de anexar o comprovante do Pix), que anota o acerto e zera o saldo",
      "Visão por mês, filtro por categoria (Perfil, Automação, SMS, Captcha, Disparo, Venda BM, Sem categoria) e despesas por categoria. Só quem anotou pode apagar, ninguém edita",
    ],
  },
  {
    version: "2.35",
    date: "23/10/2026",
    items: ["Campanha: dá para trocar o nome no lápis ao lado do nome, no topo. O relatório do cliente (inclusive o link público) mostra o nome novo na hora"],
  },
  {
    version: "2.34",
    date: "23/10/2026",
    items: ["Teste de envio: avisa antes se alguma variável ficou vazia, e quando a Meta recusa mostra o que foi enviado e se a imagem do cabeçalho abre de fora"],
  },
  {
    version: "2.33",
    date: "23/10/2026",
    items: ["Conexões: o Testar conexão mostra as permissões do token e diz qual está faltando para enviar (ex.: whatsapp_business_messaging) ou se a conta do WhatsApp não foi liberada para ele"],
  },
  {
    version: "2.32",
    date: "23/10/2026",
    items: ["Chat: o botão de link das mensagens de disparo agora é clicável e abre o mesmo link que a pessoa recebeu (não conta como clique dela)"],
  },
  {
    version: "2.31",
    date: "23/10/2026",
    items: [
      "Campanha: o teste de envio tenta os números do grupo até um enviar (antes usava sempre o primeiro)",
      "Números sempre no formato do WhatsApp em todo o Fuzil (planilha, teste, login do gerador de links): sem 55 ganha o 55, celular sem o 9 ganha o 9. O teste de envio aceita o número de qualquer jeito",
      "Se pegar uma BM que a Meta baniu, o Fuzil tira ela do disparo na hora, manda para 🚫 Banidas e segue para outra BM",
    ],
  },
  {
    version: "2.30",
    date: "23/10/2026",
    items: [
      "Conexões: Verificar todas confere cada conta igual ao Testar conexão (token e avisos da Meta), sincroniza e devolve na hora para os grupos de antes as BMs que estavam com problema e agora estão ok (as colocadas à mão continuam esperando o Resolvido)",
      "Conexões: conta com a chave secreta de um app antigo passa a usar sozinha a chave padrão do app do Fuzil quando o token é dele",
    ],
  },
  {
    version: "2.29",
    date: "23/10/2026",
    items: [
      "Correção: o botão do teste de envio abre o link certo também pelo domínio curto dos links",
      "Conexões: o Testar conexão agora confere se os avisos da Meta (entregue, lida, resposta, falha) estão chegando e liga sozinho o que estiver desligado",
      "Correção: ao conectar com o token do app do Fuzil, o webhook do app também é ligado (antes era pulado e as entregas não apareciam)",
    ],
  },
  {
    version: "2.28",
    date: "23/10/2026",
    items: ["Campanha: o botão do teste de envio abre o link da campanha (antes dava \"link não encontrado\"). Sai com os dados da 1ª linha da planilha e não conta como clique"],
  },
  {
    version: "2.27",
    date: "23/10/2026",
    items: ["Site: landing nova com os diferenciais do Fuzil (soma de limite das BMs, rodízio de números, template padrão em todas as BMs, BM com problema saindo sozinha, estorno e relatório ao vivo), comparação lado a lado e aviso de testes fechados"],
  },
  {
    version: "2.26",
    date: "23/10/2026",
    items: ["Campanha: a lista de números, o disparo, as métricas e o CSV seguem exatamente a ordem da planilha (vale para planilhas subidas a partir de agora)"],
  },
  {
    version: "2.25",
    date: "23/10/2026",
    items: ["Campanha: o teste de envio sai preenchido igual ao disparo (variáveis do Conteúdo com os dados da 1ª linha da planilha)"],
  },
  {
    version: "2.24",
    date: "23/10/2026",
    items: ["Conexões: chave secreta só aparece para o dono do Fuzil (o bloco \"Receber respostas no Chat\" e o campo de chave em \"Atualizar token\"). Clientes e administradores usam a chave padrão sozinhos e só trocam o token"],
  },
  {
    version: "2.23",
    date: "23/10/2026",
    items: [
      "Templates padrão: quando a Meta rejeita, o Fuzil apaga o rejeitado e manda de novo sozinho com o próximo nome (_2, _3...), até 10 tentativas por conta",
      "Gerador de links: texto novo do aviso de novo acesso (o antigo era rejeitado). O Fuzil troca sozinho em todos os funis e reenvia para a Meta onde foi rejeitado",
    ],
  },
  {
    version: "2.22",
    date: "23/10/2026",
    items: ["Templates: passar o mouse no nome mostra a prévia num balão por cima da tela, sem abrir espaço na lista"],
  },
  {
    version: "2.21",
    date: "23/10/2026",
    items: [
      "Admin: etiqueta \"Dono do Fuzil\" no seu nome e \"Admin do Fuzil\" em quem é administrador",
      "Admin: usuários de cada conta organizados (nome e etiquetas em cima, e-mail, último acesso e botões embaixo)",
      "Admin: botão \"Dar administrador\" / \"Tirar administrador\" em cada usuário (só o dono vê). Quem vira administrador ganha o funil do gerador de links e os modelos de aquecimento na conta dele",
    ],
  },
  {
    version: "2.20",
    date: "23/10/2026",
    items: ["Conexões: a Chave secreta padrão aparece só para o dono do Fuzil, na conta dele (clientes e outros administradores não veem)"],
  },
  {
    version: "2.19",
    date: "23/10/2026",
    items: ["Atualizações chegam mais rápido: o servidor confere a cada 1 minuto (antes 5) e monta o site na metade do tempo"],
  },
  {
    version: "2.18",
    date: "23/10/2026",
    items: ["Conexões: o campo ID da WABA voltou (a Meta não lista as contas pelo token do usuário do sistema). Passo a passo, tour e tutoriais atualizados com onde achar o ID"],
  },
  {
    version: "2.17",
    date: "23/10/2026",
    items: ["Conexões: quando a Meta não lista as contas do WhatsApp no token (comum em usuário do sistema), o Fuzil procura pelas BMs que o token acessa. Se ainda não achar, mostra o que a Meta respondeu"],
  },
  {
    version: "2.16",
    date: "23/10/2026",
    items: ["Aquecimento: toda conta de administrador do Fuzil pode criar o seu funil do gerador de links (Login do gerador de links). O login do site reparte as pessoas novas entre os funis ligados, e quem já entrou continua no mesmo, então cada um aquece o grupo da sua conta"],
  },
  {
    version: "2.15",
    date: "23/10/2026",
    items: ["Conexões: o Fuzil agora pergunta à Meta pelo app do Fuzil quais contas do WhatsApp o token acessa (com token de BM de cliente a Meta só responde assim). Se não achar, mostra o motivo que a Meta deu"],
  },
  {
    version: "2.14",
    date: "23/10/2026",
    items: [
      "Aquecimento: modelos prontos de funil. No Novo funil é só clicar no modelo e escolher o grupo: o Fuzil copia página, vagas, perguntas, mensagens e timers iguais aos funis dos administradores do Fuzil e já manda os templates para as BMs do grupo",
      "Toda conta ganha de padrão os grupos Aquecimento (laranja) e Prontas para disparo (verde), além dos grupos automáticos de problema",
      "No Novo funil, o grupo Aquecimento já vem escolhido",
    ],
  },
  {
    version: "2.13",
    date: "23/10/2026",
    items: ["Conexões: ficou só o campo do token (saíram os botões Cloud API / Coexistência e o campo ID da WABA). Cola o token, clica em Conectar e o Fuzil acha e conecta todas as contas do WhatsApp", "As 3 permissões do token aparecem certinho: whatsapp_business_messaging, whatsapp_business_management e business_management"],
  },
  {
    version: "2.12",
    date: "23/10/2026",
    items: [
      "Conexões: não precisa mais do ID da WABA. Cola só o token do usuário do sistema e o Fuzil acha sozinho as contas do WhatsApp que ele acessa e conecta todas",
      "Se quiser conectar só uma conta, ainda dá para colar o ID da WABA",
      "Tutoriais e passo a passo de Conexões atualizados com o jeito novo: pedir acesso ao app do Fuzil, criar o fuzil-api, Atribuir ativos (Assign assets), gerar o token e colar",
    ],
  },
  {
    version: "2.11",
    date: "23/10/2026",
    items: ["Campanha → Envio: números removidos da Meta (ou de teste) não aparecem mais em \"Fora desta campanha\", e os motivos aparecem em português (ex.: Template em análise)"],
  },
  {
    version: "2.10",
    date: "22/10/2026",
    items: [
      "Conexões: botão \"Verificar todas\" do lado de Suas conexões (confere todas as BMs na Meta de uma vez) e o botão de cada conta agora se chama \"Verificar\"",
      "Grupos: os grupos automáticos (Banidas, Pagamento, Sem número, Template em análise, Qualidade baixa e BMs com problema) aparecem sempre, mesmo vazios",
      "Correção: BMs que nunca dispararam também vão sozinhas para 📱 Sem número, 💳 Problemas de pagamento e 📝 Template em análise (antes só mudavam de grupo depois do primeiro disparo, e uma BM sem número nunca dispara)",
      "Novo grupo automático 📱 Sem número (amarelo, igual ao de pagamento): BMs sem nenhum número conectado para disparar vão para lá sozinhas e voltam para o grupo de disparo quando o número for registrado",
    ],
  },
  {
    version: "2.09",
    date: "22/10/2026",
    items: [
      "Início: \"Disponível hoje\" soma só as BMs prontas para disparar (as com problema ou sem cartão/número/template não contam)",
      "Grupos: limite e disponível de cada grupo também somam só as BMs prontas",
      "Início: na lista \"Limite de cada BM\" aparece a etiqueta do grupo de cada BM, na cor do grupo, e as prontas vêm primeiro",
      "Métricas com lógica: quem leu, clicou ou respondeu conta como entregue (e quem clicou ou respondeu conta como lida). Não aparece mais \"1 clique e 0 entregues\"",
      "Campanhas: lidas e cliques em % das entregues, igual às Métricas",
    ],
  },
  {
    version: "2.08",
    date: "22/10/2026",
    items: ["Conexões: a etiqueta do grupo em cada BM agora tem a mesma cor do grupo (Banidas vermelho, Pagamento amarelo, Template em análise azul, Qualidade baixa rosa, BMs com problema preto e os seus grupos na cor que você escolheu)"],
  },
  {
    version: "2.07",
    date: "22/10/2026",
    items: [
      "Visual repaginado: botões coloridos, letras um pouco maiores e com mais contraste, títulos com a marca laranja do Fuzil",
      "Gavetas com faixa colorida do lado (cor do status ou do grupo) e seta destacada",
      "Números com cores diferentes (enviadas laranja, entregues verde, lidas azul, cliques roxo, respostas rosa)",
      "Campanhas: cada uma com faixa da cor da situação, barra de progresso e resultados em etiquetas coloridas",
      "Métricas: \"O que aconteceu com cada número\" mostra uns 10 por vez, o resto com barra de rolagem",
      "Templates padrão: o texto do template só aparece ao abrir a gaveta, num balão igual ao WhatsApp",
      "Alertas com cor por gravidade (vermelho, amarelo, azul)",
    ],
  },
  {
    version: "2.06",
    date: "22/10/2026",
    items: [
      "Tour guiado para contas novas: o Fuzil pergunta se a pessoa quer o tour e mostra, destacando cada parte da tela, do conectar a BM até o primeiro disparo. Dá para refazer em Tutoriais",
      "Conexões: passo a passo para conectar a BM (pedir acesso ao app do Fuzil, criar o usuário fuzil-api, dar acesso, gerar o token e pegar o ID da WABA), com botão de copiar o ID do app",
      "Botão verde \"Pedir aprovação no WhatsApp\" no passo \"Espere a aprovação\", para a gente aprovar o acesso ao app rapidinho",
      "A chave secreta do app do Fuzil entra sozinha também nas BMs que os clientes conectam",
    ],
  },
  {
    version: "2.05",
    date: "22/10/2026",
    items: ["Grupos: a bolinha na frente do nome agora é só a cor que você escolheu. Se o grupo estiver sem número ativo ou sem limite, aparece um aviso escrito do lado"],
  },
  {
    version: "2.04",
    date: "22/10/2026",
    items: [
      "Grupos de problema separados por tipo, cada um com sua cor: 🚫 Banidas (vermelho), 💳 Problemas de pagamento (amarelo), 📝 Template em análise (azul), 📉 Número com qualidade baixa (rosa) e ⚠️ BMs com problema (preto) para o que o Fuzil não identificar",
      "O Fuzil move as BMs entre esses grupos sozinho quando o problema muda, e devolve para o grupo de disparo quando o problema some. As colocadas à mão só voltam no Resolvido",
      "Seus grupos de disparo continuam do jeito que você montar",
    ],
  },
  {
    version: "2.03",
    date: "22/10/2026",
    items: [
      "Conexões (administradores do Fuzil): \"Chave secreta padrão\". Você coloca uma vez e toda BM nova conectada recebe ela sozinha (o campo some da conexão manual)",
      "Ao trocar a chave padrão (ex.: app do Tech Provider), dá para trocar também nas BMs que usam a chave atual. O Fuzil liga o webhook de novo nelas",
    ],
  },
  {
    version: "2.02",
    date: "22/10/2026",
    items: ["Conexões: cada conta da BM ficou em blocos separados, com cor, ícone e mais contraste (o que falta para disparar, atualizar token e chave secreta, respostas no Chat e números). O \"Atualizar token e chave secreta\" fica em destaque laranja"],
  },
  {
    version: "2.01",
    date: "22/10/2026",
    items: ["Conexões: em cada conta da BM tem \"Atualizar token e chave secreta\". Cola só o que mudou (o ID da WABA continua o mesmo), o Fuzil confere na Meta, liga o webhook de novo e sincroniza na hora"],
  },
  {
    version: "2.00",
    date: "22/10/2026",
    items: ["Conexões: botão \"Excluir BM\" dentro de cada BM. Apaga do Fuzil as contas do WhatsApp, números, templates, conversas do chat e alertas dela, e tira ela de todos os grupos. As campanhas antigas continuam no histórico, e nada é apagado na Meta"],
  },
  {
    version: "1.99",
    date: "22/10/2026",
    items: ["Números do relatório: cada campo mostra a % (enviadas do público, lidas das enviadas, cliques e respostas das lidas) do número real e do que você digita, ao vivo. Fica vermelho se passar do limite"],
  },
  {
    version: "1.98",
    date: "22/10/2026",
    items: [
      "Relatório do cliente: os números sempre fecham. Público ≥ Enviadas ≥ Lidas ≥ Clicaram, e Responderam ≤ Lidas. Ao ajustar, o Fuzil não deixa salvar número sem lógica",
      "Quem clicou ou respondeu conta como lida, mesmo que o celular da pessoa não mande a confirmação de leitura",
    ],
  },
  {
    version: "1.97",
    date: "22/10/2026",
    items: ["Relatório do cliente: os números do disparo (público, enviadas, lidas, cliques e respostas) voltaram, em cima do valor"],
  },
  {
    version: "1.96",
    date: "22/10/2026",
    items: ["Relatório do cliente: ajustar os números fica só para administradores do Fuzil. As outras contas veem o valor a cobrar e o link"],
  },
  {
    version: "1.95",
    date: "22/10/2026",
    items: [
      "Relatório do cliente: dá para ajustar à mão os números (público, enviadas, lidas, cliques e respostas) na aba Relatório do cliente. O valor cobrado e o funil (inclusive ao passar o mouse) usam esses números. As Métricas continuam com os números reais, e um botão volta para eles",
      "O relatório do cliente ficou só com o topo, o valor da campanha e o funil (saíram os números soltos, como terminou cada mensagem, tempos, motivos de falha e respostas)",
    ],
  },
  {
    version: "1.94",
    date: "22/10/2026",
    items: [
      "Cobrança no relatório: dá para cadastrar várias chaves Pix (chave, nome de quem recebe e banco) e escolher em cada campanha qual aparece, ou todas",
      "O relatório mostra a chave Pix com o botão \"Copiar chave Pix\" (saíram o copia e cola e o QR Code)",
      "Relatório do cliente: faixa com a contagem regressiva de quanto tempo o link ainda fica no ar. Links criados antes ganharam 12h",
    ],
  },
  {
    version: "1.93",
    date: "22/10/2026",
    items: [
      "Link do relatório do cliente: atualiza ao vivo e fica no ar por 12 horas. Depois disso sai do ar e é apagado sozinho",
      "O relatório mostra \"Ao vivo · sai do ar em\" com contagem regressiva. Na aba Relatório do cliente dá para dar mais 12 horas",
    ],
  },
  {
    version: "1.92",
    date: "22/10/2026",
    items: [
      "Campanhas: nova aba \"6. Relatório do cliente\", com o valor a cobrar (enviadas × valor por mensagem) e um link do relatório para mandar ao cliente, sem login. Dá para desligar o link quando quiser",
      "Relatório: mostra o valor da campanha e o seu Pix copia e cola já com o valor, com QR Code e botão de copiar",
      "Configurações: nova parte \"Cobrança no relatório do cliente\" (chave Pix, nome, cidade e valor padrão por mensagem)",
      "Relatório do cliente: saiu o \"Desempenho por número\" (continua em Métricas)",
    ],
  },
  {
    version: "1.91",
    date: "22/10/2026",
    items: ["Relatório de envio: saiu \"Entregues\". O anel mostra as enviadas, e lidas e respostas são contadas sobre as enviadas"],
  },
  {
    version: "1.90",
    date: "22/10/2026",
    items: ["Campanhas, métricas: a tabela \"O que aconteceu com cada número\" mostra uns 20 números por vez, com barra de rolagem (o cabeçalho fica parado)"],
  },
  {
    version: "1.89",
    date: "22/10/2026",
    items: ["Campanhas, link do botão: texto de ajuda mais curto"],
  },
  {
    version: "1.88",
    date: "22/10/2026",
    items: [
      "Campanhas: a etapa Audiência agora vem antes do Conteúdo, para as variáveis já mostrarem as colunas da planilha",
      "Variáveis: cada uma tem 3 tipos (Da planilha, Dado do cliente, Texto fixo). As colunas aparecem com um exemplo, e embaixo mostra como vai sair com a 1ª linha da planilha",
      "Link do botão também aceita a coluna com uma chave só: https://site.com/?cnpj={cnpj}",
    ],
  },
  {
    version: "1.87",
    date: "22/10/2026",
    items: [
      "Campanhas, variáveis: o texto fixo pode misturar com a planilha (ex.: \"Saldo em aberto: {{var3}}\")",
      "Campanhas, variáveis: nova opção \"primeiro nome de\" uma coluna, para planilhas que não têm a coluna nome",
    ],
  },
  {
    version: "1.86",
    date: "22/10/2026",
    items: ["Campanhas: o link do botão pode levar dados da planilha. Ex.: https://site.com/?cnpj={{var1}} manda cada pessoa para o link com o CNPJ dela. Na etapa Conteúdo tem os botões das colunas e um exemplo com a 1ª linha"],
  },
  {
    version: "1.85",
    date: "22/10/2026",
    items: ["Grupos de BM: todos os grupos abrem fechados, inclusive \"BMs com problema\" (o resumo continua aparecendo do lado de fora)"],
  },
  {
    version: "1.84",
    date: "22/10/2026",
    items: [
      "\"API access blocked\" volta a tirar a BM dos grupos de disparo (a BM não dispara assim). O motivo agora explica: a Meta bloqueou o app da BM, geralmente pedindo uma verificação em developers.facebook.com",
      "Quando o acesso voltar, a BM volta sozinha para os grupos em que estava",
    ],
  },
  {
    version: "1.83",
    date: "22/10/2026",
    items: ["Grupos de BM: em \"Mandar para o grupo\" agora tem a opção \"BMs com problema\". A BM sai dos grupos de disparo e volta para onde estava quando você clicar em Resolvido"],
  },
  {
    version: "1.82",
    date: "22/10/2026",
    items: [
      "Correção importante: o erro \"API access blocked\" (falta do Tech Provider) não tira mais as BMs dos grupos nem gera alerta de falha todo dia. O token está certo e os disparos funcionam",
      "As BMs que foram para \"BMs com problema\" só por esse erro voltam sozinhas para os grupos em que estavam",
      "Sincronização por partes: se a Meta negar um dado, os números e templates continuam atualizando",
      "Conexões e Testar conexão explicam esse caso direito (antes dizia que o token tinha expirado)",
    ],
  },
  {
    version: "1.81",
    date: "22/10/2026",
    items: [
      "Gerador de links: o Fuzil confere sozinho se o funil tem o template de código e o de aviso de acesso. Se faltar algum, ele recria e sobe nas BMs do grupo",
      "Aquecimento: botão Excluir no topo de cada funil",
    ],
  },
  {
    version: "1.80",
    date: "22/10/2026",
    items: [
      "Templates padrão: quando a Meta rejeita, dá para mudar o texto ali mesmo e reenviar. O Fuzil sobe de novo com o próximo nome só nas BMs onde foi rejeitado",
      "O motivo da rejeição aparece em português",
      "Gerador de links: o template de boas-vindas ganhou um texto mais simples e está sendo reenviado sozinho onde foi rejeitado",
      "Correção: ao trocar o grupo do funil do gerador de links, o template de aviso de acesso ficava no grupo antigo. Agora acompanha o funil",
    ],
  },
  {
    version: "1.79",
    date: "22/10/2026",
    items: [
      "Aquecimento: novo tipo de funil \"Login do gerador de links\" (só na conta do dono da plataforma), com os templates prontos: código, aviso de novo acesso (Fui eu / Não fui eu) e boas-vindas",
      "Gerador de links (fuzildisparador.com.br/links): sem senha, o cliente entra pelo WhatsApp com código. Login salvo no computador; IP novo pede código de novo; a cada acesso chega o aviso no WhatsApp",
      "Cada cliente vê só os links dele: cria, copia o código, vê os cliques, troca o destino e apaga",
    ],
  },
  {
    version: "1.78",
    date: "22/10/2026",
    items: ["Links externos saíram do painel e viraram um site separado. Novo: gerador de links do botão, num site público (fuzildisparador.com.br/links), sem precisar de login. O cliente cria o link com a senha de acesso, copia o código e cola na variável do botão na outra plataforma. Ele troca o destino e vê os cliques pelo link secreto que recebe", "Admin: senha de acesso do gerador e lista de todos os links criados (dá para apagar qualquer um)"],
  },
  {
    version: "1.77",
    date: "22/10/2026",
    items: ["Novo: Links externos, para disparar os templates do Fuzil por outra plataforma com o botão funcionando"],
  },
  {
    version: "1.76",
    date: "22/10/2026",
    items: ["Correção: o aviso de alerta no canto da tela repetia sem parar. Agora cada alerta aparece uma vez só, some sozinho e, se chegarem muitos juntos, vira um aviso só (\"X alertas novos\")"],
  },
  {
    version: "1.75",
    date: "22/10/2026",
    items: ["Painel mais leve: o fundo laranja não usa mais desfoque pesado e o brilho da setinha acompanha o mouse sem atraso"],
  },
  {
    version: "1.74",
    date: "22/10/2026",
    items: ["Confirmações (excluir, cancelar, remover...) agora aparecem numa janela do Fuzil no meio da tela, com o botão dizendo exatamente o que vai acontecer"],
  },
  {
    version: "1.73",
    date: "22/10/2026",
    items: ["Templates: os modelos prontos agora são só o fuzil_utilidade1 (atualização de pedido com imagem)"],
  },
  {
    version: "1.72",
    date: "22/10/2026",
    items: [
      "Avisos novos: tudo que você salva, envia ou testa mostra um aviso no canto direito da tela, explicando em palavras simples o que aconteceu (verde quando deu certo, vermelho quando não deu)",
      "Ao criar um template, o aviso explica que ele foi para a Meta aprovar e quanto tempo costuma levar",
      "Fundo do painel com brilho laranja bem clarinho e a logo do Fuzil apagada, em todas as telas",
    ],
  },
  {
    version: "1.71",
    date: "22/10/2026",
    items: ["Templates: novo modelo pronto \"fuzil_utilidade1\" (atualização de pedido com imagem): imagem no cabeçalho, 4 variáveis e botão Detalhes", "O modelo já vem com uma imagem do Fuzil de atualização de pedido (dá para trocar)"],
  },
  {
    version: "1.70",
    date: "22/10/2026",
    items: ["Templates: ao criar um template (padrão ou normal), escolha um modelo pronto do Fuzil (pedido, entrega, cadastro, candidatura, agendamento, pagamento, fatura, conta, protocolo). Ele preenche tudo e você edita o que quiser"],
  },
  {
    version: "1.69",
    date: "22/10/2026",
    items: ["Campanhas, teste de envio: quando a Meta recusa, o Fuzil mostra a qual WABA o número pertence de verdade e se ele pode enviar (ajuda a achar o erro 132001)"],
  },
  {
    version: "1.68",
    date: "21/10/2026",
    items: ["Campanhas: novo relatório de envio interativo, com a logo do Fuzil, taxa de entrega, funil (público → enviadas → entregues → lidas → cliques → respostas), resultado de cada mensagem, desempenho por número e motivos de falha. Botão para salvar em PDF"],
  },
  {
    version: "1.67",
    date: "21/10/2026",
    items: ["Templates: a busca agora procura pelo nome da BM"],
  },
  {
    version: "1.66",
    date: "21/10/2026",
    items: ["Campanhas, métricas: atualizam ao vivo, sem F5 (a cada 3s enquanto envia e a cada 8s depois, para entregas, leituras, cliques e respostas)"],
  },
  {
    version: "1.65",
    date: "21/10/2026",
    items: [
      "Templates: a busca filtra enquanto você digita",
      "Templates: no lugar de categorias, escolha qual grupo de BM aparece",
      "Disparo: o rodízio começa por um número diferente a cada rodada, para campanhas pequenas não saírem todas pelo mesmo número",
      "Chat: os disparos aparecem como o cliente recebeu, com a imagem do cabeçalho, o rodapé e os botões",
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
