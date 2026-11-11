// Textos e números do site novo (preços exatamente como a tabela comercial; nada de promoção inventada).

export const V2_PACKAGES = [
  { name: "Avulso", from: "1.000", price: "0,30", off: null },
  { name: "Start", from: "3.000", price: "0,25", off: 17 },
  { name: "Plus", from: "6.000", price: "0,22", off: 27 },
  { name: "Pro", from: "15.000", price: "0,20", off: 33 },
  { name: "Escala", from: "50.000", price: "0,18", off: 40 },
  { name: "Máximo", from: "100.000", price: "0,16", off: 47, best: true },
] as const;

export const V2_MSG = "Oi! Vim pelo site e quero falar com a equipe sobre um disparo.";

/** "2 bilhões", "5 milhões" (sempre arredondado para baixo). */
export const provenSends = (n: number) =>
  n >= 2_000_000_000 ? `${Math.floor(n / 1_000_000_000).toLocaleString("pt-BR")} bilhões`
  : n >= 1_000_000_000 ? "1 bilhão"
  : n >= 1_000_000 ? `${Math.floor(n / 1_000_000).toLocaleString("pt-BR")} milhões`
  : n >= 10_000 ? `${Math.floor(n / 1000).toLocaleString("pt-BR")} mil`
  : n.toLocaleString("pt-BR");

export const V2_FAQ: Array<[string, string]> = [
  ["Vocês vendem a plataforma?", "Não. A gente vende o disparo feito pela nossa equipe. O sistema é a nossa ferramenta interna: você manda a lista e a mensagem e nós cuidamos de todo o resto."],
  ["Quanto custa?", "É por pacote, e quanto maior o volume, menor o preço por disparo: de R$ 0,30 no Avulso (a partir de 1.000 disparos) até R$ 0,16 no Máximo (a partir de 100.000). Economia de até 47% em relação ao Avulso."],
  ["Quanto tempo eu tenho para usar o pacote?", "1 mês a partir do dia da contratação. Dá para dividir em vários disparos dentro desse prazo."],
  ["Preciso ter conta na Meta, BM ou número?", "Não. A gente usa as nossas contas e números. Você só manda a lista de contatos e a mensagem."],
  ["É pelo WhatsApp oficial?", "Sim. Disparamos pela API oficial do WhatsApp Business, da Meta, e somos Meta Business Partner."],
  ["Qual a diferença entre disparo único e fluxo?", "Disparo único é uma mensagem para a lista toda. No fluxo, quando a pessoa responde, as próximas mensagens chegam sozinhas, como uma conversa pronta."],
  ["Como eu sei o que foi enviado?", "Você recebe um relatório que atualiza ao vivo: enviadas, entregues, lidas, cliques e quem respondeu. Mensagem que falhou não entra na conta."],
  ["Quanto tempo demora?", "Depende da aprovação da mensagem pela Meta. O prazo a gente combina com você no WhatsApp, junto com o orçamento."],
];
