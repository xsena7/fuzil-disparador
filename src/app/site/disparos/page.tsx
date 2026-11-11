import type { Metadata } from "next";
import { ArrowRight, BarChart3, BadgeCheck, BellRing, CheckCheck, Sparkles, ClipboardList, Landmark, MessageCircle, Megaphone, Repeat, Rocket, Send, ShieldCheck, Smartphone, Store, Tag, Ticket, Wallet, Workflow, XCircle } from "lucide-react";
import { company } from "@/lib/company";
import { roundDown, totalSent } from "@/lib/site-stats";
import { siteWhatsApp } from "../cta";

// Landing dos anúncios (leads do Facebook): só disparo feito pela equipe, tudo explicado simples, tudo leva ao WhatsApp
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Disparo em massa no WhatsApp · Fuzil Disparador",
  description: "A gente dispara suas mensagens no WhatsApp para milhares de pessoas. Você manda a lista e a mensagem, a gente faz o resto. A partir de R$ 0,16 por disparo, em pacotes com até 47% de desconto.",
};

const MSG = "Oi! Vi o anúncio e quero fazer um orçamento de disparo.";

const USES: Array<{ icon: typeof Tag; name: string; text: string; adult?: boolean }> = [
  { icon: Tag, name: "Promoções e ofertas", text: "Cupom, oferta relâmpago, queima de estoque e novidades para quem já é seu cliente." },
  { icon: Rocket, name: "Lançamentos", text: "Avise do lançamento, da abertura do carrinho e do último dia da oferta." },
  { icon: BellRing, name: "Cobranças e avisos", text: "Boleto, pedido, agendamento e lembretes que chegam onde a pessoa realmente lê." },
  { icon: Landmark, name: "Financeiras e correspondentes", text: "Consignado, FGTS e crédito para a sua base de clientes." },
  { icon: Ticket, name: "Bets e sorteios autorizados", text: "Bônus, eventos, sorteios e aviso de ganhador para a sua base.", adult: true },
  { icon: Store, name: "O seu negócio", text: "Vende outra coisa? Conta pra gente no WhatsApp que a gente monta o disparo para você." },
];

// Disparo pronto: pacotes por volume (só preço por disparo; nunca mostrar o total do pacote)
const PACKAGES = [
  { name: "Avulso", from: "1.000", price: "0,30", off: null },
  { name: "Start", from: "3.000", price: "0,25", off: 17 },
  { name: "Plus", from: "6.000", price: "0,22", off: 27 },
  { name: "Pro", from: "15.000", price: "0,20", off: 33 },
  { name: "Escala", from: "50.000", price: "0,18", off: 40 },
  { name: "Máximo", from: "100.000", price: "0,16", off: 47, best: true },
];

/** "2 bilhões", "5 milhões" (sempre arredondado para baixo, para nunca passar do número real). */
const provenSends = (n: number) =>
  n >= 2_000_000_000 ? `${Math.floor(n / 1_000_000_000).toLocaleString("pt-BR")} bilhões`
  : n >= 1_000_000_000 ? "1 bilhão"
  : n >= 1_000_000 ? `${Math.floor(n / 1_000_000).toLocaleString("pt-BR")} milhões`
  : roundDown(n);

const STEPS = [
  { icon: MessageCircle, title: "Chama no WhatsApp", text: "Clica no botão verde e fala com a gente. Conta o que você vende." },
  { icon: Wallet, title: "Escolhe o pacote", text: "Quanto mais dispara, menos paga: de R$ 0,30 a R$ 0,16 por disparo." },
  { icon: ClipboardList, title: "Manda a lista e a mensagem", text: "Você envia os números (planilha ou lista) e o que quer falar." },
  { icon: Send, title: "A gente dispara", text: "Montamos tudo, disparamos e te mandamos o relatório de quem recebeu, leu e clicou." },
];

// O número da Experiência vem do contador (disparos do Fuzil + SITE_PRIOR_SENDS, em Admin → Empresa)
const whyList = (sent: number) => [
  { icon: Sparkles, title: "Experiência", text: `${sent >= 10_000 ? `Mais de ${provenSends(sent)} de mensagens disparadas pela nossa equipe. ` : ""}A gente sabe o texto, o horário e a lista que funcionam.` },
  { icon: BadgeCheck, title: "Lista higienizada", text: "Antes de disparar, tiramos números repetidos, inválidos e quem pediu para sair. Você não paga para mandar para ninguém." },
  { icon: BarChart3, title: "Relatório ao vivo", text: "Um link que atualiza sozinho: enviadas, entregues, lidas, cliques e quem respondeu, com nome e número." },
  { icon: Wallet, title: "Só paga o que sair", text: "Mensagem que falhou não entra na conta. O valor final sai do relatório, com os números na sua frente." },
];

const NO_NEED = ["Ter BM ou conta na Meta", "Comprar chip ou número", "Mexer em sistema", "Saber de tecnologia"];

const FAQ: Array<[string, string]> = [
  ["Quanto custa?", "É por pacote, e quanto mais dispara, menos paga: R$ 0,30 por disparo no Avulso (a partir de 1.000 disparos) até R$ 0,16 no Máximo (a partir de 100.000). São pacotes com até 47% de desconto, e cada pacote vale por 1 mês a partir do dia da contratação. Escolha o seu e chame no WhatsApp."],
  ["Quanto tempo eu tenho para usar o pacote?", "1 mês a partir do dia da contratação. Dá para dividir em vários disparos dentro desse prazo."],
  ["Vocês disparam para o meu nicho?", "Sim: promoções e ofertas, lançamentos, cobranças e avisos, financeiras e correspondentes, bets e sorteios autorizados e o que mais o seu negócio precisar. Conta no WhatsApp o que você vende."],
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
      <section className="relative overflow-hidden bg-[#1C1C1E] text-white">
        <div className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-56 -right-40 size-[520px] rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="relative mx-auto max-w-3xl px-5 py-14 text-center md:py-20">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-orange-200 ring-1 ring-white/15">
            <ShieldCheck className="size-3.5" /> WhatsApp oficial da Meta
          </span>
          <h1 className="font-display mt-5 text-4xl leading-tight md:text-6xl">
            A gente dispara sua mensagem no WhatsApp para <span className="text-fire">milhares de pessoas</span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-300">Você manda a lista e a mensagem. A gente faz todo o resto. Simples assim.</p>
          <div className="mt-8 flex justify-center">
            <WaButton href={wa} big>Quero um orçamento</WaButton>
          </div>
          <p className="mt-3 text-sm text-zinc-400">A partir de <b className="text-white">R$ 0,16</b> por disparo · pacotes com até 47% de desconto</p>
          {sent >= 10_000 && <p className="mt-6 text-sm text-zinc-400"><b className="text-white">{provenSends(sent)}</b> de mensagens já disparadas pela nossa equipe</p>}
        </div>
      </section>

      {/* Por que com a gente */}
      <section id="por-que" className="mx-auto max-w-5xl px-5 pt-14">
        <h2 className="font-display text-center text-3xl text-zinc-900">Por que disparar com a gente</h2>
        <p className="mt-2 text-center text-zinc-500">Você cuida do seu negócio. A gente cuida do disparo.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {whyList(sent).map((w) => (
            <div key={w.title} className="flex gap-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-soft">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-gradient text-white shadow-sm shadow-orange-500/30"><w.icon className="size-6" /></span>
              <div>
                <div className="text-lg font-bold text-zinc-900">{w.title}</div>
                <p className="mt-1 text-zinc-600">{w.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Para que serve */}
      <section id="nichos" className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="font-display text-center text-3xl text-zinc-900">Para que serve</h2>
        <p className="mt-2 text-center text-zinc-500">Disparamos para qualquer negócio. Os usos mais comuns:</p>
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          {USES.map((u) => (
            <div key={u.name} className="relative rounded-2xl border border-zinc-200 bg-white p-6 shadow-soft">
              {u.adult && <span className="absolute right-4 top-4 rounded-full bg-zinc-900 px-2 py-0.5 text-xs font-bold text-white">+18</span>}
              <span className="grid size-11 place-items-center rounded-2xl bg-fire text-white shadow-sm shadow-orange-500/30"><u.icon className="size-5" /></span>
              <div className="mt-3 text-lg font-bold text-zinc-900">{u.name}</div>
              <p className="mt-1 text-zinc-600">{u.text}</p>
              {u.adult && <p className="mt-2 text-xs font-semibold text-zinc-500">Só operações autorizadas · jogue com responsabilidade</p>}
            </div>
          ))}
        </div>
      </section>

      {/* Modalidades */}
      <section id="modalidades" className="bg-[#E6E5EB]">
        <div className="mx-auto max-w-5xl px-5 py-14">
          <h2 className="font-display text-center text-3xl text-zinc-900">Dois jeitos de disparar</h2>
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
                <Bubble>Oi, Maria! Sua oferta de 20% chegou 🎉 Aproveite aqui: <span className="text-sky-600 underline">link</span></Bubble>
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
      <section id="como-funciona" className="mx-auto max-w-5xl px-5 py-14">
        <h2 className="font-display text-center text-3xl text-zinc-900">Como funciona</h2>
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

      {/* Pacotes do disparo pronto */}
      <section id="preco" className="bg-[#1C1C1E] text-white">
        <div className="mx-auto max-w-4xl px-5 py-14">
          <div className="text-center">
            <h2 className="font-display text-3xl md:text-4xl">Pacotes do disparo pronto</h2>
            <p className="mt-3 text-lg text-zinc-300">
              A partir de <b className="text-fire text-2xl">R$ 0,16</b> por disparo
            </p>
            <p className="mt-1 text-zinc-400">Pacotes com até 47% de desconto · quanto mais dispara, menos paga</p>
          </div>
          <div className="mt-8 space-y-3">
            {PACKAGES.map((p) => (
              <div
                key={p.name}
                className={`flex flex-wrap items-center gap-x-5 gap-y-3 rounded-2xl px-5 py-4 ring-1 ${p.best ? "bg-white/10 ring-2 ring-[#FF6A2B]" : "bg-white/5 ring-white/10"}`}
              >
                <div className="min-w-[9rem] flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-xl">{p.name}</span>
                    {p.best && <span className="bg-fire rounded-full px-2.5 py-0.5 text-xs font-bold">Melhor preço</span>}
                  </div>
                  <div className="text-sm text-zinc-400">a partir de {p.from} disparos</div>
                </div>
                <div className="w-28 text-right">
                  <div className="text-2xl font-bold">R$ {p.price}</div>
                  <div className="text-xs text-zinc-400">por disparo</div>
                </div>
                <div className={`text-center sm:w-20 ${p.off ? "" : "hidden sm:block"}`}>
                  {p.off ? <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-sm font-bold text-emerald-300 ring-1 ring-emerald-400/30">-{p.off}%</span> : <span className="text-sm text-zinc-500">–</span>}
                </div>
                <a
                  href={siteWhatsApp(`Oi! Vim pelo site e quero o pacote ${p.name}`)}
                  target="_blank"
                  rel="noreferrer"
                  className={`inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold sm:w-auto ${p.best ? "bg-[#25D366] text-white" : "bg-white/10 text-white hover:bg-white/15"}`}
                >
                  <MessageCircle className="size-4" /> Quero o {p.name}
                </a>
              </div>
            ))}
          </div>
          <p className="mt-6 text-center text-sm text-zinc-400">Todo pacote vale por <b className="text-zinc-200">1 mês</b> a partir do dia da contratação. Desconto em relação ao Avulso. Relatório de quem recebeu, leu e clicou em todos os pacotes.</p>
          <div className="mt-6 flex justify-center">
            <WaButton href={wa} big>Falar com a gente no WhatsApp</WaButton>
          </div>
        </div>
      </section>

      {/* Perguntas */}
      <section id="duvidas" className="mx-auto max-w-3xl px-5 py-14">
        <h2 className="font-display text-center text-3xl text-zinc-900">Dúvidas</h2>
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
        <div className="rounded-3xl bg-fire p-8 text-white shadow-lg shadow-orange-500/20">
          <Repeat className="mx-auto size-8" />
          <h2 className="font-display mt-3 text-3xl">Bora disparar?</h2>
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
