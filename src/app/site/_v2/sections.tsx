// Seções do site novo: cada página monta as suas (a inicial fica curta; o resto está nas páginas do topo).
import { ArrowRight, ArrowDown, BadgeCheck, Landmark, Ticket, BarChart3, BellRing, CalendarClock, CreditCard, Filter, Megaphone, MessagesSquare, Radar, Repeat2, Rocket, ShieldCheck, Tag, Wallet, Workflow } from "lucide-react";
import { company } from "@/lib/company";
import { totalSent } from "@/lib/site-stats";
import { siteWhatsApp } from "../cta";
import { V2_FAQ, V2_MSG, V2_PACKAGES, provenSends } from "./content";
import { Parallax } from "./effects";
import { DispatchSim } from "./dispatch-sim";
import { Process } from "./process";
import { Pricing } from "./pricing";
import { Faq } from "./faq";


const DIFFS = [
  { icon: Filter, title: "Lista higienizada", text: "Antes de disparar, tiramos números repetidos, inválidos e quem pediu para sair." },
  { icon: BarChart3, title: "Relatório ao vivo", text: "Um link que atualiza sozinho: enviadas, entregues, lidas, cliques e respostas." },
  { icon: Wallet, title: "Só paga o que sair", text: "Mensagem que falhou não entra na conta. O valor final sai do relatório." },
  { icon: ShieldCheck, title: "API oficial do WhatsApp", text: "Disparo pela API oficial da Meta. A Fuzil é Meta Business Partner." },
  { icon: Workflow, title: "Disparo único ou fluxo", text: "Uma mensagem para a lista toda ou uma conversa que continua sozinha quando a pessoa responde." },
  { icon: MessagesSquare, title: "Equipe do seu lado", text: "Você fala com gente de verdade no WhatsApp, do orçamento ao relatório final." },
];

const SOLUTIONS: Array<{ icon: typeof Tag; title: string; text: string; adult?: boolean }> = [
  { icon: Tag, title: "Promoções", text: "Cupons, ofertas relâmpago e novidades para quem já é seu cliente." },
  { icon: Rocket, title: "Lançamentos", text: "Abertura de carrinho, lembrete de evento e último dia da oferta." },
  { icon: Megaphone, title: "Avisos", text: "Mudança de horário, novidade importante ou comunicado para toda a base." },
  { icon: CalendarClock, title: "Lembretes", text: "Agendamentos, consultas, eventos e datas que não podem ser esquecidas." },
  { icon: CreditCard, title: "Cobranças", text: "Vencimento, segunda via e confirmação de pagamento onde a pessoa lê." },
  { icon: BellRing, title: "Comunicação com clientes", text: "Pós-venda, pesquisa de satisfação e relacionamento com a sua base." },
  { icon: Landmark, title: "Financeiras e correspondentes", text: "Consignado, FGTS e crédito para a sua base de clientes." },
  { icon: Ticket, title: "Bets e sorteios autorizados", text: "Bônus, eventos, sorteios e aviso de ganhador para a sua base.", adult: true },
];

const TECH = [
  { icon: Radar, title: "Conexões monitoradas", text: "Qualidade e limites de cada número acompanhados o tempo todo." },
  { icon: Repeat2, title: "Rodízio automático", text: "O volume é distribuído entre vários números para manter a entrega saudável." },
  { icon: BadgeCheck, title: "Mensagens no padrão da Meta", text: "Templates organizados e aprovados antes de qualquer envio." },
  { icon: BarChart3, title: "Métricas em tempo real", text: "Cada envio vira dado no relatório: entrega, leitura, clique e resposta." },
];

export function Section({ id, eyebrow, title, intro, children, className = "", bare = false }: { id?: string; eyebrow: string; title: React.ReactNode; intro?: string; children: React.ReactNode; className?: string; bare?: boolean }) {
  // bare: logo abaixo do topo da página, que já mostra o mesmo título
  if (bare) return <section id={id} className={`relative mx-auto max-w-6xl scroll-mt-24 px-5 pb-20 pt-10 sm:pb-24 ${className}`}>{children}</section>;
  return (
    <section id={id} className={`relative mx-auto max-w-6xl scroll-mt-24 px-5 py-24 sm:py-32 ${className}`}>
      <div data-reveal className="max-w-2xl">
        <div className="eyebrow">{eyebrow}</div>
        <h2 className="t-title mt-4 text-4xl sm:text-5xl">{title}</h2>
        {intro && <p className="t-muted mt-5 text-lg leading-relaxed">{intro}</p>}
      </div>
      <div className="mt-14">{children}</div>
    </section>
  );
}

export function Hero() {
  const wa = siteWhatsApp(V2_MSG);
  return (
    <>
      <Parallax className="relative isolate overflow-hidden">
        <div className="grid-bg pointer-events-none absolute inset-0 -z-10" style={{ transform: "translate3d(0, calc(var(--sy) * 0.25), 0)" }} />
        {/* Luz laranja que segue o cursor (fica no centro no celular) */}
        <div
          className="pointer-events-none absolute -z-10 size-[720px] -translate-x-1/2 -translate-y-1/2 rounded-full opacity-70 blur-3xl"
          style={{ left: "var(--px, 70%)", top: "var(--py, 40%)", background: "radial-gradient(circle, rgba(255,106,0,0.22), rgba(255,48,61,0.08) 45%, transparent 70%)", transition: "left .6s ease-out, top .6s ease-out" }}
        />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-40 bg-gradient-to-b from-transparent to-[var(--ink)]" />

        <div className="mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-36 sm:pt-44 lg:grid-cols-[1.1fr_1fr] lg:pb-24">
          <div style={{ transform: "translate3d(calc(var(--mx) * -6px), calc(var(--sy) * -0.08), 0)" }}>
            <div data-reveal className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-3 text-xs text-white/80">
              <span className="rounded-full bg-white/10 px-2 py-0.5 font-semibold">API oficial</span> Disparos executados pela nossa equipe
            </div>
            <h1 data-reveal style={{ ["--d" as string]: "80ms" }} className="t-display mt-7 text-[clamp(2.9rem,5.6vw,4.7rem)]">
              Sua mensagem.<br /><span className="t-fire">Nossa operação.</span>
            </h1>
            <p data-reveal style={{ ["--d" as string]: "160ms" }} className="t-muted mt-7 max-w-xl text-lg leading-relaxed sm:text-xl">
              Disparos em massa no WhatsApp com execução pela equipe da Fuzil, tecnologia própria e organização em cada etapa.
            </p>
            <div data-reveal style={{ ["--d" as string]: "240ms" }} className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a href={wa} target="_blank" rel="noreferrer" className="btn-fire">Fale com nossa equipe no WhatsApp <ArrowRight className="arrow size-4" /></a>
              <a href="/precos" className="btn-ghost">Conheça nossos pacotes <ArrowDown className="size-4" /></a>
            </div>
            <p data-reveal style={{ ["--d" as string]: "320ms" }} className="mt-6 text-sm text-white/45">Pacotes de R$ 0,30 a R$ 0,16 por disparo, conforme o volume.</p>
          </div>

          <div className="relative" data-reveal style={{ ["--d" as string]: "200ms" }}>
            <div style={{ transform: "perspective(1400px) rotateY(calc(var(--mx) * -4deg)) rotateX(calc(var(--my) * 3deg)) translate3d(0, calc(var(--sy) * -0.05), 0)" }} className="will-change-transform">
              <DispatchSim />
            </div>
            {/* Camadas flutuando em profundidades diferentes */}
            <div className="float absolute -top-14 left-2 hidden sm:block" style={{ transform: "translate3d(calc(var(--mx) * 18px), calc(var(--my) * 18px), 0)" }}>
              <div className="surface flex items-center gap-2 px-3.5 py-2.5 text-xs"><ShieldCheck className="size-4 text-[var(--orange)]" /> Meta Business Partner</div>
            </div>
            <div className="float absolute -bottom-7 right-4 hidden sm:block" style={{ animationDelay: "-3s", transform: "translate3d(calc(var(--mx) * 26px), calc(var(--my) * 26px), 0)" }}>
              <div className="surface flex items-center gap-2 px-3.5 py-2.5 text-xs"><BarChart3 className="size-4 text-[var(--orange)]" /> Relatório ao vivo</div>
            </div>
          </div>
        </div>
      </Parallax>

    </>
  );
}

export function ServiceStrip() {

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 py-10">
        <div data-reveal className="surface grid gap-8 p-8 sm:p-12 md:grid-cols-[1.2fr_1fr] md:items-center">
          <div>
            <div className="eyebrow">O serviço</div>
            <p className="t-title mt-4 text-3xl sm:text-4xl">Você não contrata um sistema. <span className="text-[var(--gray)]">Contrata uma equipe que dispara por você.</span></p>
          </div>
          <ul className="grid grid-cols-1 gap-3 text-[15px] sm:grid-cols-2">
            {["Sem conta na Meta", "Sem comprar chip ou número", "Sem mexer em sistema", "Sem saber de tecnologia"].map((x) => (
              <li key={x} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-3 text-white/85">
                <span className="grid size-5 place-items-center rounded-full bg-[#ff6a00]/15 text-[var(--orange)]">✓</span> {x}
              </li>
            ))}
          </ul>
        </div>
      </section>

    </>
  );
}

export function Diffs() {

  return (
    <>
      <Section id="diferenciais" eyebrow="Diferenciais" title={<>Tudo o que um disparo precisa, <span className="text-[var(--gray)]">feito com cuidado.</span></>}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFS.map((d, k) => (
            <div key={d.title} data-reveal style={{ ["--d" as string]: `${(k % 3) * 80}ms` }} className="spot surface p-7 transition-transform duration-500 hover:-translate-y-1">
              <d.icon className="size-6 text-[var(--orange)]" strokeWidth={1.6} />
              <h3 className="mt-6 text-lg font-semibold">{d.title}</h3>
              <p className="t-muted mt-2 leading-relaxed">{d.text}</p>
            </div>
          ))}
        </div>
      </Section>

    </>
  );
}

export async function Proof() {
  const sent = company().priorSends + (await totalSent());
  return (
    <>
      {sent >= 10_000 && (
        <section className="relative overflow-hidden border-y border-white/10 bg-[#0c0d11] py-24 sm:py-32">
          <div className="pointer-events-none absolute left-1/2 top-1/2 size-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(255,106,0,0.16),transparent_60%)]" />
          <div data-reveal className="relative mx-auto max-w-4xl px-5 text-center">
            <div className="eyebrow justify-center">Experiência</div>
            <div className="t-display mt-6 text-[clamp(3.4rem,11vw,8.5rem)]">
              <span className="text-[var(--gray)]">+</span><span className="t-fire">{provenSends(sent)}</span>
            </div>
            <p className="mt-4 text-xl text-white/85 sm:text-2xl">de mensagens disparadas pela nossa equipe.</p>
            <p className="t-muted mx-auto mt-4 max-w-xl">A gente sabe o texto, o horário e a lista que funcionam, porque já fez isso em escala.</p>
          </div>
        </section>
      )}

    </>
  );
}

export function Tech() {

  return (
    <>
      <Section id="sobre" eyebrow="Tecnologia própria" title={<>Tecnologia nos bastidores. <span className="text-[var(--gray)]">Simplicidade para você.</span></>} intro="Por trás de cada disparo existe um sistema interno da Fuzil que organiza campanhas, conexões e métricas. Você não precisa usar nada disso: só recebe o resultado.">
        <div className="grid items-center gap-10 lg:grid-cols-[1fr_1.1fr]">
          <ul className="grid gap-3">
            {TECH.map((t, k) => (
              <li key={t.title} data-reveal style={{ ["--d" as string]: `${k * 70}ms` }} className="flex gap-4 rounded-2xl border border-white/10 bg-white/[0.02] p-5">
                <t.icon className="mt-0.5 size-5 shrink-0 text-[var(--orange)]" strokeWidth={1.7} />
                <div>
                  <div className="font-semibold">{t.title}</div>
                  <div className="t-muted mt-1 text-sm leading-relaxed">{t.text}</div>
                </div>
              </li>
            ))}
          </ul>
          {/* Painel ilustrativo da operação (sem números) */}
          <div data-reveal style={{ ["--d" as string]: "120ms" }} className="surface-solid relative overflow-hidden p-5">
            <div className="mb-4 flex items-center gap-1.5">
              <span className="size-2.5 rounded-full bg-white/15" /><span className="size-2.5 rounded-full bg-white/15" /><span className="size-2.5 rounded-full bg-white/15" />
              <span className="ml-3 text-xs text-[var(--gray)]">Painel interno · ilustração</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {["Conexões", "Qualidade", "Rodízio"].map((x, k) => (
                <div key={x} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-[11px] text-[var(--gray)]">{x}</div>
                  <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-300"><span className="size-1.5 rounded-full bg-emerald-400" style={{ animation: `v2-pulse 2.4s ${k * 0.4}s infinite` }} /> Ativo</div>
                </div>
              ))}
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              <div className="mb-4 text-[11px] text-[var(--gray)]">Ritmo de envio</div>
              <div className="flex h-28 items-end gap-1.5">
                {[38, 52, 46, 64, 58, 72, 66, 80, 74, 88, 82, 94, 86, 92].map((h, k) => (
                  <span key={k} className="flex-1 rounded-t bg-gradient-to-t from-[#ff6a00]/30 to-[#ff6a00]" style={{ height: `${h}%`, opacity: 0.35 + k / 22 }} />
                ))}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px]">
              {["Enviadas", "Entregues", "Lidas", "Cliques"].map((x) => (
                <div key={x} className="rounded-lg border border-white/10 bg-white/[0.02] py-2 text-[var(--gray)]">{x}</div>
              ))}
            </div>
          </div>
        </div>
      </Section>

    </>
  );
}

export function ProcessSection({ bare = false }: { bare?: boolean } = {}) {

  return (
    <>
      <Section bare={bare} id="como-funciona" eyebrow="Como funciona" title={<>Você envia a lista. <span className="t-fire">A gente cuida do disparo.</span></>}>
        <div data-reveal><Process /></div>
      </Section>

    </>
  );
}

export function Solutions({ bare = false }: { bare?: boolean } = {}) {

  return (
    <>
      <Section bare={bare} id="solucoes" eyebrow="Soluções" title={<>Para cada tipo de mensagem, <span className="text-[var(--gray)]">uma operação pronta.</span></>} intro="Atendemos qualquer nicho que fale com a própria base de clientes. Se o seu caso não está aqui, conta pra gente no WhatsApp.">
        <div className="grid gap-px overflow-hidden rounded-3xl border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-4">
          {SOLUTIONS.map((s, k) => (
            <div key={s.title} data-reveal style={{ ["--d" as string]: `${(k % 4) * 70}ms` }} className="spot bg-[var(--ink)] p-8 transition-colors duration-300 hover:bg-[#0e0f13]">
              <s.icon className="size-6 text-white/70" strokeWidth={1.5} />
              <h3 className="mt-8 flex flex-wrap items-center gap-2 text-lg font-semibold">{s.title}{s.adult && <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] font-bold text-[var(--gray)]">+18</span>}</h3>
              <p className="t-muted mt-2 text-sm leading-relaxed">{s.text}</p>
            </div>
          ))}
        </div>
      </Section>

    </>
  );
}

export function PricingSection({ bare = false }: { bare?: boolean } = {}) {
  const packages = V2_PACKAGES.map((p) => ({ ...p, best: "best" in p ? p.best : false, href: siteWhatsApp(`Oi! Vim pelo site e quero o pacote ${p.name} (a partir de ${p.from} disparos, R$ ${p.price} por disparo).`) }));
  return (
    <>
      <Section bare={bare} id="precos" eyebrow="Pacotes" title={<>Quanto maior o volume, <span className="t-fire">menor o preço.</span></>} intro="Escolha o pacote para ver os detalhes. Economia de até 47% em relação ao Avulso. Todo pacote vale por 1 mês a partir da contratação.">
        <div data-reveal><Pricing packages={packages} /></div>
        <p className="mt-6 text-center text-xs text-white/40">O preço de R$ 0,16 vale para o pacote Máximo, a partir de 100.000 disparos.</p>
      </Section>

    </>
  );
}

export function FaqSection() {

  return (
    <>
      <Section id="duvidas" eyebrow="Dúvidas" title="Perguntas frequentes">
        <div data-reveal><Faq items={V2_FAQ} /></div>
      </Section>

    </>
  );
}

export function FinalCta() {
  const wa = siteWhatsApp(V2_MSG);
  return (
    <>
      <section id="contato" className="mx-auto max-w-6xl scroll-mt-24 px-5 pb-28">
        <div data-reveal className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#0e0f13] px-6 py-20 text-center sm:px-12">
          <div className="pointer-events-none absolute inset-x-0 -bottom-40 mx-auto h-80 max-w-3xl rounded-full bg-[radial-gradient(ellipse,rgba(255,106,0,0.35),rgba(255,48,61,0.12)_45%,transparent_70%)] blur-2xl" />
          <h2 className="t-display relative text-[clamp(2.4rem,6vw,4.5rem)]">Sua próxima campanha<br /><span className="t-fire">começa aqui.</span></h2>
          <p className="t-muted relative mx-auto mt-6 max-w-lg text-lg">Mande a sua lista e a sua mensagem. A nossa equipe responde no WhatsApp com o orçamento.</p>
          <div className="relative mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <a href={wa} target="_blank" rel="noreferrer" className="btn-fire">Fale com nossa equipe no WhatsApp <ArrowRight className="arrow size-4" /></a>
            <a href="/precos" className="btn-ghost">Conheça nossos pacotes</a>
          </div>
        </div>
      </section>
    </>
  );
}

/** Topo das páginas internas (Como funciona, Soluções, Preços, Sobre, Contato). */
export function PageHeader({ eyebrow, title, intro }: { eyebrow: string; title: React.ReactNode; intro?: string }) {
  return (
    <section className="relative isolate overflow-hidden">
      <div className="grid-bg pointer-events-none absolute inset-0 -z-10" />
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[420px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(ellipse,rgba(255,106,0,0.18),transparent_65%)] blur-2xl" />
      <div className="mx-auto max-w-6xl px-5 pb-6 pt-36 sm:pt-44">
        <div data-reveal className="eyebrow">{eyebrow}</div>
        <h1 data-reveal style={{ ["--d" as string]: "80ms" }} className="t-display mt-5 max-w-4xl text-[clamp(2.6rem,6vw,4.6rem)]">{title}</h1>
        {intro && <p data-reveal style={{ ["--d" as string]: "160ms" }} className="t-muted mt-6 max-w-2xl text-lg leading-relaxed">{intro}</p>}
      </div>
    </section>
  );
}

/** Atalhos da página inicial para as páginas do topo (a inicial fica curta, principalmente no celular). */
export function Explore() {
  const items = [
    { href: "/como-funciona", title: "Como funciona", text: "Você envia a lista, a gente organiza e dispara. Veja as 3 etapas." },
    { href: "/solucoes", title: "Soluções", text: "Promoções, lançamentos, cobranças, financeiras, bets e mais." },
    { href: "/precos", title: "Preços", text: "Seis pacotes, de R$ 0,30 a R$ 0,16 por disparo, conforme o volume." },
    { href: "/sobre", title: "Sobre a Fuzil", text: "Tecnologia própria, API oficial e a experiência da nossa equipe." },
  ];
  return (
    <section className="mx-auto max-w-6xl px-5 py-16 sm:py-24">
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((it, k) => (
          <a key={it.href} href={it.href} data-reveal style={{ ["--d" as string]: `${(k % 2) * 80}ms` }} className="spot surface group flex items-center justify-between gap-6 p-6 transition-transform duration-500 hover:-translate-y-1 sm:p-7">
            <span>
              <span className="block text-lg font-semibold">{it.title}</span>
              <span className="t-muted mt-1 block text-sm leading-relaxed">{it.text}</span>
            </span>
            <ArrowRight className="size-5 shrink-0 text-[var(--orange)] transition-transform group-hover:translate-x-1" />
          </a>
        ))}
      </div>
    </section>
  );
}

/** Disparo único x fluxo, com exemplo de conversa. */
export function Modes() {
  const Bubble = ({ me = false, children }: { me?: boolean; children: React.ReactNode }) => (
    <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-[13px] leading-snug ${me ? "ml-auto rounded-tr-sm bg-[#005c4b] text-white" : "rounded-tl-sm bg-[#1f2c33] text-white/90"}`}>{children}</div>
  );
  return (
    <Section eyebrow="Modalidades" title={<>Dois jeitos de disparar. <span className="text-[var(--gray)]">A gente te ajuda a escolher.</span></>}>
      <div className="grid gap-4 md:grid-cols-2">
        <div data-reveal className="surface p-7">
          <div className="text-xl font-semibold">Disparo único</div>
          <p className="t-muted mt-2">Todo mundo da lista recebe a mesma mensagem, com o seu link. É o mais simples e rápido.</p>
          <div className="mt-6 space-y-2 rounded-2xl bg-[#0b141a] p-4 ring-1 ring-white/5">
            <Bubble>Oi, Maria! Sua oferta de 20% chegou. Aproveite aqui: <span className="text-sky-300 underline">link</span></Bubble>
          </div>
        </div>
        <div data-reveal style={{ ["--d" as string]: "80ms" }} className="surface p-7">
          <div className="text-xl font-semibold">Fluxo</div>
          <p className="t-muted mt-2">A pessoa responde e as próximas mensagens chegam sozinhas, como uma conversa pronta.</p>
          <div className="mt-6 space-y-2 rounded-2xl bg-[#0b141a] p-4 ring-1 ring-white/5">
            <Bubble>Oi, João! Você tem saldo de FGTS para liberar. Quer saber quanto?</Bubble>
            <Bubble me>Quero</Bubble>
            <Bubble>Perfeito! Clique aqui e veja na hora: <span className="text-sky-300 underline">link</span></Bubble>
          </div>
        </div>
      </div>
      <p className="mt-4 text-xs text-white/35">Exemplos ilustrativos.</p>
    </Section>
  );
}
