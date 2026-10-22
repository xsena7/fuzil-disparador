// Versão do Fuzil Disparador. A cada atualização: sobe o número e adiciona as novidades no topo.

export const CHANGELOG: Array<{ version: string; date: string; items: string[] }> = [
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
