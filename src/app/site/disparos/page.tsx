import type { Metadata } from "next";
import { ArrowRight, CheckCheck, CheckCircle2, ClipboardList, MessageCircle, Repeat, Send, ShieldCheck, Smartphone, Wallet, Workflow, XCircle } from "lucide-react";
import { company } from "@/lib/company";
import { roundDown, totalSent } from "@/lib/site-stats";
import { siteWhatsApp } from "../cta";

// Landing dos anúncios (leads do Facebook): só disparo feito pela equipe, tudo explicado simples, tudo leva ao WhatsApp
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Disparo em massa no WhatsApp · Fuzil Disparador",
  description: "A gente dispara suas mensagens no WhatsApp para milhares de pessoas. Você manda a lista e a mensagem, a gente faz o resto. A partir de R$ 0,20 por disparo.",
};

const MSG = "Oi! Vi o anúncio e quero fazer um orçamento de disparo.";

const NICHES = [
  { name: "Bet", text: "Avise sua base sobre bônus, eventos e novidades da sua casa." },
  { name: "Rifas", text: "Divulgue a rifa nova, lembre do sorteio e avise o ganhador." },
  { name: "Corban", text: "Ofereça consignado, FGTS e crédito para quem já é da sua lista." },
  { name: "Clínicas", text: "Confirme consultas, lembre retornos e divulgue promoções para seus pacientes." },
  { name: "E-commerce", text: "Avise de promoção, cupom, carrinho abandonado e pedido enviado." },
  { name: "Seu nicho", text: "Vende outra coisa? A gente dispara para qualquer nicho. Chama que a gente monta para você." },
];

const STEPS = [
  { icon: MessageCircle, title: "Chama no WhatsApp", text: "Clica no botão verde e fala com a gente. Conta o que você vende." },
  { icon: Wallet, title: "Recebe o orçamento", text: "A gente te passa o valor por disparo para o seu nicho. Sem surpresa." },
  { icon: ClipboardList, title: "Manda a lista e a mensagem", text: "Você envia os números (planilha ou lista) e o que quer falar." },
  { icon: Send, title: "A gente dispara", text: "Montamos tudo, disparamos e te mandamos o relatório de quem recebeu, leu e clicou." },
];

const NO_NEED = ["Ter BM ou conta na Meta", "Comprar chip ou número", "Mexer em sistema", "Saber de tecnologia"];

const FAQ: Array<[string, string]> = [
  ["Quanto custa?", "A partir de R$ 0,20 por mensagem enviada. O valor certo depende do seu nicho e da quantidade: chame no WhatsApp que a gente faz o orçamento na hora."],
  ["Vocês disparam para o meu nicho?", "Sim. Disparamos para qualquer nicho: bet, rifas, corban, clínicas, e-commerce e o que você precisar. Conta no WhatsApp o que você vende."],
  ["Preciso ter alguma conta ou número?", "Não. A gente usa as nossas contas e números. Você só manda a lista de contatos e a mensagem."],
  ["Qual a diferença entre disparo único e fluxo?", "Disparo único é uma mensagem só para a lista toda. No fluxo, quando a pessoa responde, ela recebe as próximas mensagens sozinha, como uma conversa pronta."],
  ["Como eu sei que foi enviado?", "Você recebe o relatório com quantos receberam, leram e clicaram no link."],
  ["É pelo WhatsApp oficial?", "Sim. Disparamos pela API oficial do WhatsApp, da Meta."],
  ["Quanto tempo demora?", "Depende da aprovação da mensagem pela Meta. O prazo a gente combina com você no WhatsApp, junto com o orçamento."],
];

function WaButton({ href, children, big = false }: { href: string; children: React.ReactNode; big?: boolean }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] font-bold text-white shadow-lg shadow-emerald-500/30 transition hover:brightness-105 sm:w-auto ${big ? "px-7 py-4 text-lg" : "px-5 py-3"}`}
    >
      <MessageCircle className={big ? "size-6" : "size-5"} /> {children}
    </a>
  );
}

/** Balão de conversa do WhatsApp (exemplo). */
function Bubble({ me = false, children }: { me?: boolean; children: React.ReactNode }) {
  return (
    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ${me ? "ml-auto rounded-tr-sm bg-[#d9fdd3] text-zinc-800" : "rounded-tl-sm bg-white text-zinc-800"}`}>
      {children}
      {!me && <div className="mt-0.5 flex justify-end"><CheckCheck className="size-3.5 text-sky-500" /></div>}
    </div>
  );
}

export default async function DisparosPage() {
  const c = company();
  const wa = siteWhatsApp(MSG);
  const sent = c.priorSends + (await totalSent());
  return (
    <div className="bg-white pb-24 sm:pb-0">
      {/* Topo */}
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-56 -right-40 size-[520px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 py-14 text-center md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-200 ring-1 ring-white/15">
            <ShieldCheck className="size-3.5" /> WhatsApp oficial da Meta
          </span>
          <h1 className="mt-5 text-4xl font-bold leading-tight md:text-6xl">
            A gente dispara sua mensagem no WhatsApp para <span className="text-brand-gradient">milhares de pessoas</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-300">Você manda a lista e a mensagem. A gente faz todo o resto. Simples assim.</p>
          <div className="mt-8 flex justify-center">
            <WaButton href={wa} big>Quero um orçamento</WaButton>
          </div>
          <p className="mt-3 text-sm text-zinc-400">A partir de <b className="text-white">R$ 0,20</b> por disparo · orçamento pelo WhatsApp</p>
          {sent >= 10_000 && <p className="mt-6 text-sm text-zinc-400"><b className="text-white">{roundDown(sent)}</b> de mensagens já disparadas pela nossa equipe</p>}
        </div>
      </section>

      {/* Nichos */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-center text-3xl font-bold text-zinc-900">Para quem é</h2>
        <p className="mt-2 text-center text-zinc-500">Disparamos para qualquer nicho. Alguns exemplos:</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {NICHES.map((n) => (
            <div key={n.name} className="rounded-2xl border border-zinc-200 bg-white p-6 text-center shadow-soft">
              <div className="text-2xl font-bold text-brand-gradient">{n.name}</div>
              <p className="mt-2 text-zinc-600">{n.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Modalidades */}
      <section className="bg-zinc-50">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="text-center text-3xl font-bold text-zinc-900">Dois jeitos de disparar</h2>
          <p className="mt-2 text-center text-zinc-500">Você escolhe. Se não souber qual, a gente te ajuda.</p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-zinc-200/70">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-orange-50 text-orange-600"><Send className="size-5" /></span>
                <div>
                  <div className="text-xl font-bold text-zinc-900">Disparo único</div>
                  <div className="text-sm text-zinc-500">Uma mensagem para a lista toda</div>
                </div>
              </div>
              <p className="mt-4 text-zinc-600">Todo mundo da lista recebe a mesma mensagem, com o seu link. É o mais simples e rápido.</p>
              <div className="mt-4 space-y-2 rounded-2xl bg-[#efeae2] p-4">
                <Bubble>Oi, Maria! Saiu a rifa nova 🎉 Garanta o seu número aqui: <span className="text-sky-600 underline">link</span></Bubble>
              </div>
            </div>
            <div className="rounded-3xl bg-white p-6 shadow-soft ring-1 ring-zinc-200/70">
              <div className="flex items-center gap-3">
                <span className="grid size-11 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Workflow className="size-5" /></span>
                <div>
                  <div className="text-xl font-bold text-zinc-900">Fluxo</div>
                  <div className="text-sm text-zinc-500">Uma conversa pronta</div>
                </div>
              </div>
              <p className="mt-4 text-zinc-600">A pessoa recebe a primeira mensagem. Quando ela responde, as próximas chegam sozinhas, como se alguém estivesse conversando.</p>
              <div className="mt-4 space-y-2 rounded-2xl bg-[#efeae2] p-4">
                <Bubble>Oi, João! Você tem saldo de FGTS para liberar. Quer saber quanto?</Bubble>
                <Bubble me>Quero</Bubble>
                <Bubble>Perfeito! Clique aqui e veja na hora: <span className="text-sky-600 underline">link</span></Bubble>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona */}
      <section className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="text-center text-3xl font-bold text-zinc-900">Como funciona</h2>
        <p className="mt-2 text-center text-zinc-500">4 passos. Você só faz os 3 primeiros.</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-full bg-brand-gradient text-sm font-bold text-white">{i + 1}</span>
                <s.icon className="size-5 text-zinc-400" />
              </div>
              <div className="mt-3 font-bold text-zinc-900">{s.title}</div>
              <p className="mt-1 text-sm text-zinc-600">{s.text}</p>
            </li>
          ))}
        </ol>
        <div className="mt-8 rounded-3xl bg-zinc-50 p-6 ring-1 ring-zinc-200/70">
          <div className="font-bold text-zinc-900">Você NÃO precisa:</div>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {NO_NEED.map((t) => (
              <li key={t} className="flex items-center gap-2 text-zinc-700"><XCircle className="size-5 shrink-0 text-rose-500" /> {t}</li>
            ))}
          </ul>
        </div>
      </section>

      {/* Preço */}
      <section className="bg-ink text-white">
        <div className="mx-auto max-w-3xl px-5 py-14 text-center">
          <h2 className="text-3xl font-bold">Quanto custa</h2>
          <div className="mt-6 inline-block rounded-3xl bg-white/5 px-8 py-6 ring-1 ring-white/10">
            <div className="text-sm text-zinc-400">a partir de</div>
            <div className="text-6xl font-bold text-brand-gradient">R$ 0,20</div>
            <div className="mt-1 text-zinc-300">por mensagem enviada</div>
          </div>
          <ul className="mx-auto mt-6 max-w-md space-y-2 text-left text-zinc-300">
            <li className="flex gap-2"><CheckCircle2 className="size-5 shrink-0 text-emerald-400" /> O valor depende do nicho e da quantidade</li>
            <li className="flex gap-2"><CheckCircle2 className="size-5 shrink-0 text-emerald-400" /> Orçamento rápido pelo WhatsApp, sem compromisso</li>
            <li className="flex gap-2"><CheckCircle2 className="size-5 shrink-0 text-emerald-400" /> Relatório de quem recebeu, leu e clicou</li>
          </ul>
          <div className="mt-8 flex justify-center">
            <WaButton href={wa} big>Fazer meu orçamento</WaButton>
          </div>
        </div>
      </section>

      {/* Perguntas */}
      <section className="mx-auto max-w-3xl px-5 py-14">
        <h2 className="text-center text-3xl font-bold text-zinc-900">Dúvidas</h2>
        <div className="mt-8 space-y-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl border border-zinc-200 bg-white p-5 shadow-soft">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-zinc-900">
                {q} <ArrowRight className="size-4 shrink-0 text-zinc-400 transition group-open:rotate-90" />
              </summary>
              <p className="mt-3 text-zinc-600">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* Fechamento */}
      <section className="mx-auto max-w-3xl px-5 pb-16 text-center">
        <div className="rounded-3xl bg-brand-gradient p-8 text-white shadow-lg shadow-orange-500/20">
          <Repeat className="mx-auto size-8" />
          <h2 className="mt-3 text-3xl font-bold">Bora disparar?</h2>
          <p className="mt-2 text-white/90">Chama no WhatsApp e receba seu orçamento agora.</p>
          <div className="mt-6 flex justify-center">
            <WaButton href={wa} big>Chamar no WhatsApp</WaButton>
          </div>
        </div>
      </section>

      {/* Botão fixo no celular */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-zinc-200 bg-white/95 p-3 backdrop-blur sm:hidden">
        <a href={wa} target="_blank" rel="noreferrer" className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#25D366] py-3.5 text-lg font-bold text-white shadow-lg shadow-emerald-500/30">
          <Smartphone className="size-5" /> Orçamento no WhatsApp
        </a>
      </div>
    </div>
  );
}
