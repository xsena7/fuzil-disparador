import type { Metadata } from "next";
import Link from "next/link";
import { siteWhatsApp } from "../cta";

export const metadata: Metadata = {
  title: "Perguntas frequentes sobre disparo pela API oficial do WhatsApp | Fuzil Disparador",
  description: "Limite de 250 por dia, template de utilidade x marketing, qualidade do número, BM banida, preço por mensagem, cartão na Meta e mais: respostas diretas sobre disparo pela API oficial do WhatsApp.",
  alternates: { canonical: "/perguntas" },
};

// Respostas curtas e diretas: é o que o Google e as IAs (ChatGPT, Gemini) usam para responder quem pergunta
const FAQ: Array<{ q: string; a: string; link?: { href: string; label: string } }> = [
  {
    q: "O que é a API oficial do WhatsApp?",
    a: "É o jeito autorizado pela Meta de uma empresa mandar mensagens pelo WhatsApp em escala, por sistema. Diferente de ferramentas não oficiais (que usam o WhatsApp do celular e costumam ser banidas), a API oficial usa números registrados numa conta do WhatsApp Business ligada a uma BM (Business Manager) e só manda mensagens fora da conversa usando templates aprovados pela Meta.",
  },
  {
    q: "O que é o limite de 250, 2 mil ou 10 mil por dia?",
    a: "É o limite de mensagens que inicia conversa que a BM pode mandar para pessoas diferentes em 24 horas. Toda BM nova começa baixa e a Meta sobe o limite conforme a BM manda com boa qualidade. O limite vale para a BM inteira, somando todos os números dela. Juntar várias BMs num grupo soma os limites.",
  },
  {
    q: "Qual a diferença entre template de utilidade e de marketing?",
    a: "Utilidade é aviso ligado a algo que a pessoa já tem com a empresa: pedido, entrega, cobrança, agendamento, atualização de conta. Marketing é promoção, oferta ou convite para comprar. A Meta cobra mais caro pelo marketing e é mais rígida com ele. Se o texto de um template de utilidade parecer propaganda, a Meta pode mudar a categoria para marketing sozinha.",
  },
  {
    q: "Por que a Meta mudou meu template de utilidade para marketing?",
    a: "Porque achou que o texto tem cara de promoção: desconto, oferta, \"aproveite\", chamada para comprar. Para manter como utilidade, o texto precisa ser um aviso concreto sobre algo do cliente (um pedido, um cadastro, um pagamento), sem linguagem de venda.",
  },
  {
    q: "O que é a qualidade do número (verde, amarela, vermelha)?",
    a: "É a nota que a Meta dá ao número com base em quantas pessoas bloqueiam ou denunciam as mensagens. Verde é saudável. Amarela é atenção. Vermelha pode limitar ou derrubar o número. Para manter verde: mande só para quem conhece a empresa, com texto claro e opção de sair.",
    link: { href: "/erros/131048", label: "Erro 131048: limite por denúncia" },
  },
  {
    q: "Por que muitas mensagens aparecem como não entregues?",
    a: "Na maioria das vezes o número não tem WhatsApp, a pessoa bloqueou a empresa ou está com o app muito desatualizado (erro 131026). Também pode ser a Meta segurando a mensagem para não cansar quem já recebeu muitas mensagens de empresas (erro 131049). Limpar a lista antes de disparar ajuda bastante.",
    link: { href: "/erros/131026", label: "Erro 131026: não entregue" },
  },
  {
    q: "Precisa de cartão de crédito na Meta para disparar?",
    a: "Sim. A Meta cobra cada mensagem de template direto da conta do WhatsApp Business, por isso a BM precisa ter uma forma de pagamento válida cadastrada. Sem isso aparecem erros de pagamento (131042 e 131044) e a mensagem não sai.",
    link: { href: "/erros/131042", label: "Erro 131042: problema de pagamento" },
  },
  {
    q: "Quanto custa disparar com o Fuzil Disparador?",
    a: "Para empresas com BM própria: R$ 0,01 por disparo, sem mensalidade. A tarifa da Meta é cobrada à parte, direto no cartão da conta do WhatsApp. Mensagem que falha não é cobrada: o crédito volta para o saldo. Para quem não tem BM e quer contratar o disparo pronto: pacotes por volume, a partir de R$ 0,16 por disparo (quanto mais dispara, menos paga, com até 47% de desconto). Cada pacote vale por 1 mês a partir do dia da contratação.",
  },
  {
    q: "Dá para usar várias BMs e vários números ao mesmo tempo?",
    a: "Sim. No Fuzil você junta as BMs num grupo e a campanha distribui os envios entre todos os números do grupo (rodízio). Se um número ou BM tiver problema, ele sai do disparo e os outros continuam.",
  },
  {
    q: "Como a pessoa sai da lista?",
    a: "Respondendo SAIR (ou PARAR). O Fuzil descadastra na hora e não manda mais nada para esse contato, em nenhuma campanha.",
  },
  {
    q: "Dá para responder os clientes depois do disparo?",
    a: "Dá. As respostas chegam no Chat do Fuzil, separadas por número. Também dá para ligar uma resposta automática ou um fluxo com botões que roda quando o contato responde.",
  },
  {
    q: "O que fazer quando aparece um erro no disparo?",
    a: "Procure o código do erro na nossa lista: cada um tem o que significa e o que fazer, em português. No Fuzil isso já aparece traduzido na campanha e nos alertas.",
    link: { href: "/erros", label: "Ver a lista de erros" },
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  };
  return (
    <article className="mx-auto max-w-3xl px-5 py-16">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 sm:text-4xl">Perguntas frequentes sobre a API oficial do WhatsApp</h1>
      <p className="mt-3 text-zinc-600">Respostas diretas para as dúvidas mais comuns de quem dispara pelo WhatsApp oficial.</p>
      <div className="mt-10 divide-y divide-zinc-100 rounded-2xl border border-zinc-200">
        {FAQ.map((f) => (
          <details key={f.q} className="group px-5 py-4 open:bg-zinc-50/60">
            <summary className="cursor-pointer list-none font-semibold text-zinc-900 [&::-webkit-details-marker]:hidden">
              <span className="mr-2 inline-block text-orange-500 transition group-open:rotate-90">›</span>
              {f.q}
            </summary>
            <p className="mt-2 leading-relaxed">{f.a}</p>
            {f.link && <Link href={f.link.href} className="mt-2 inline-block text-sm font-medium text-orange-600 hover:underline">{f.link.label} →</Link>}
          </details>
        ))}
      </div>
      <p className="mt-10 text-center text-sm text-zinc-500">
        Não achou sua dúvida?{" "}
        <a href={siteWhatsApp("Oi! Tenho uma dúvida sobre o Fuzil Disparador.")} className="font-medium text-orange-600 hover:underline">Fale com a gente no WhatsApp</a>
      </p>
    </article>
  );
}
