import { ArrowRight, BarChart3, Building2, CheckCircle2, Coins, FileText, Layers, Link2, MessagesSquare, Quote, RefreshCw, Repeat, ShieldCheck, Sparkles, Users, Zap } from "lucide-react";
import { company } from "@/lib/company";
import { SUPPORT_WHATSAPP } from "@/lib/onboarding";
import { prisma } from "@/lib/db";

// Depoimentos de clientes de verdade (nome, empresa e texto autorizados por eles). Vazio = a seção não aparece no site
const TESTIMONIALS: Array<{ name: string; role: string; text: string }> = [
  // { name: "Nome Sobrenome", role: "Cargo · Empresa", text: "O que mudou depois que começou a usar o Fuzil..." },
];

// Mensagens já enviadas pelo Fuzil (número real, guardado por 10 min para não pesar no banco)
let sentCache = { at: 0, n: 0 };
async function totalSent() {
  if (Date.now() - sentCache.at < 600_000) return sentCache.n;
  const n = await prisma.campaignRecipient.count({ where: { status: { in: ["SENT", "DELIVERED", "READ"] } } }).catch(() => sentCache.n);
  sentCache = { at: Date.now(), n };
  return n;
}
const roundDown = (n: number) => (n >= 1_000_000 ? `${Math.floor(n / 100_000) / 10} milhões`.replace(".", ",") : n >= 10_000 ? `${Math.floor(n / 1000)} mil` : n.toLocaleString("pt-BR"));

const AUDIENCES = [
  {
    icon: Building2,
    title: "Para empresas com BM própria",
    lead: "Use a ferramenta com as suas contas do WhatsApp",
    price: "R$ 0,01",
    pricePrefix: "",
    points: ["Junte suas contas e some o limite de todas", "Milhares de mensagens por dia sem conta travando", "Respostas dos clientes num chat só", "Relatório com entregues, lidas e cliques"],
    cta: "Quero usar com minhas BMs",
    msg: "Oi! Tenho uma empresa com BM própria e quero usar o Fuzil para disparar para meus clientes.",
  },
  {
    icon: Users,
    title: "Contrate o disparo pronto",
    lead: "A gente dispara para você, do começo ao fim",
    price: "R$ 0,20",
    pricePrefix: "a partir de ",
    points: ["Você manda a lista de contatos e a mensagem", "A gente monta o modelo, aprova na Meta e dispara", "Relatório ao vivo com entregues, lidas e cliques", "Sem precisar ter conta na Meta nem mexer em nada"],
    cta: "Quero contratar disparos",
    msg: "Oi! Quero contratar disparos de WhatsApp com o Fuzil.",
  },
];

// Diferenciais: o que o Fuzil faz sozinho e as plataformas tradicionais deixam na mão de quem opera
const DIFFS = [
  {
    icon: Layers,
    title: "Some o limite de várias BMs",
    text: "Junte quantas BMs quiser num grupo. O Fuzil soma o limite diário de todas e mostra quanto ainda dá para disparar hoje, só das que estão prontas.",
    tag: "Ex.: 2 mil + 10 mil + 2 mil = 14 mil por dia",
  },
  {
    icon: Repeat,
    title: "Uma campanha, vários números",
    text: "A campanha dispara pelo grupo inteiro e alterna sozinha entre os números de todas as BMs, respeitando o limite e a velocidade de cada um.",
    tag: "Rodízio automático",
  },
  {
    icon: Sparkles,
    title: "Template padrão em todas as BMs",
    text: "Crie o modelo uma vez e ele é cadastrado em todas as BMs, inclusive nas que você conectar depois. Rejeitou ou virou marketing? O Fuzil reenvia sozinho com um nome novo.",
    tag: "Cria uma vez, vale para todas",
  },
  {
    icon: ShieldCheck,
    title: "BM com problema sai sozinha",
    text: "Sem cartão, sem número, template em análise, qualidade baixa ou bloqueio: a BM sai do disparo e vai para o grupo do problema, com o motivo e como resolver. Resolveu, ela volta sozinha.",
    tag: "A campanha não para",
  },
  {
    icon: Coins,
    title: "Falhou, o crédito volta",
    text: "Cada mensagem que não sai (número sem WhatsApp, erro da Meta, limite) tem o crédito estornado automaticamente. Você só paga pelo que foi enviado.",
    tag: "Estorno automático",
  },
  {
    icon: BarChart3,
    title: "Relatório ao vivo para o seu cliente",
    text: "Mande um link do relatório da campanha que atualiza ao vivo, com enviadas, lidas, cliques e respostas.",
    tag: "Link público por 12 horas",
  },
];

const MORE = [
  { icon: FileText, title: "Variáveis direto da planilha", text: "Ligue cada variável do template a uma coluna da planilha e veja a prévia exatamente como a pessoa vai receber." },
  { icon: Link2, title: "Cliques de verdade", text: "Cada pessoa recebe um link único. Você vê quem clicou, sem contar robôs de pré-visualização." },
  { icon: MessagesSquare, title: "Chat e resposta automática", text: "As respostas de todos os números caem num chat só, com resposta automática configurável por campanha." },
  { icon: RefreshCw, title: "Qualidade e limite ao vivo", text: "Qualidade, status e limite de cada número atualizados o tempo todo, com alertas na hora em que algo muda." },
];

const COMPARE: Array<[string, string, string]> = [
  ["Limite diário", "Uma BM por vez", "Soma de todas as BMs do grupo"],
  ["Números na campanha", "Escolhe um número", "Rodízio automático entre todos"],
  ["Templates em várias BMs", "Cadastro manual em cada uma", "Cria uma vez, sobe em todas"],
  ["Template rejeitado", "Você refaz na mão", "Reenvio automático com nome novo"],
  ["BM com problema", "Você tira e recoloca na mão", "Sai sozinha e volta quando resolver"],
  ["Mensagem que falhou", "Nem sempre volta", "Crédito estornado na hora"],
];

const STEPS = [
  { title: "Conecte sua conta do WhatsApp", text: "Pelo botão oficial da Meta, em uns 2 minutos. Sem senha e sem token: a própria Meta pergunta qual conta e qual número." },
  { title: "Monte o grupo e o template", text: "Junte as BMs num grupo. O template padrão sobe sozinho em todas e você acompanha a aprovação da Meta." },
  { title: "Suba a planilha e dispare", text: "Ligue as variáveis às colunas, confira a prévia e dispare. O Fuzil distribui os envios e mostra tudo ao vivo." },
];

export default async function SitePage() {
  const c = company();
  const whatsapp = c.phone.replace(/\D/g, "") || SUPPORT_WHATSAPP;
  const waTo = (msg: string) => `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
  const wa = waTo("Oi! Quero começar a disparar com o Fuzil Disparador.");
  const sent = await totalSent();
  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -left-40 -top-40 size-[560px] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-56 -right-40 size-[560px] rounded-full bg-rose-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.15fr_1fr] md:py-28">
          <div>
            <div className="mb-5 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-200">
                <Zap className="size-3.5" /> API oficial do WhatsApp Business
              </span>
              <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300 ring-1 ring-emerald-400/30">
                <span className="size-1.5 rounded-full bg-emerald-400" /> A partir de R$ 0,01 por disparo · sem mensalidade
              </span>
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Avise milhares de clientes no WhatsApp, <span className="bg-brand-gradient bg-clip-text text-transparent">sem conta travando</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-zinc-300">
              Disparo pelo WhatsApp oficial da Meta, em grande quantidade. O {c.brand} junta suas contas, divide os envios entre elas sozinho e tira do disparo a que der problema. Você sobe a planilha e acompanha tudo ao vivo.
            </p>
            {sent >= 10_000 && (
              <p className="mt-4 text-sm text-zinc-400">
                <b className="text-white">{roundDown(sent)}</b> de mensagens já enviadas pelo {c.brand}
              </p>
            )}
            <div className="mt-8 flex flex-wrap gap-3">
              <a href={wa} className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 font-medium text-white shadow-lg shadow-orange-500/20">
                Quero começar <ArrowRight className="size-4" />
              </a>
              <a href={`${c.appUrl}/login`} className="rounded-xl bg-white/10 px-5 py-3 font-medium text-white ring-1 ring-white/15 hover:bg-white/15">Já tenho acesso</a>
            </div>
          </div>

          {/* Exemplo do painel: grupo somando o limite de 3 BMs e o rodízio dos números */}
          <div className="hidden md:block">
            <div className="rounded-3xl bg-white/5 p-6 ring-1 ring-white/10">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Grupo Disparos</span>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-semibold text-emerald-300">3 BMs prontas</span>
              </div>
              <div className="space-y-2.5">
                {[
                  ["BM Loja Centro", "10 mil/dia", 72],
                  ["BM Loja Norte", "2 mil/dia", 40],
                  ["BM Atacado", "2 mil/dia", 55],
                ].map(([name, limit, pct]) => (
                  <div key={name as string} className="rounded-xl bg-white/5 px-4 py-3 ring-1 ring-white/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-2"><span className="size-2 rounded-full bg-emerald-400" />{name}</span>
                      <span className="text-zinc-400">{limit}</span>
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-brand-gradient" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-end justify-between rounded-2xl bg-brand-gradient p-4">
                <div>
                  <div className="text-xs font-medium text-white/80">Limite somado</div>
                  <div className="text-3xl font-bold tabular-nums">14.000</div>
                </div>
                <div className="text-right text-xs text-white/85">
                  <div className="flex items-center justify-end gap-1"><Repeat className="size-3.5" /> rodízio entre 6 números</div>
                  <div className="mt-1">mensagens por dia</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="para-quem" className="mx-auto max-w-6xl scroll-mt-20 px-5 pt-20">
        <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-orange-600">Para quem é</div>
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Escolha o seu caminho</h2>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {AUDIENCES.map((a) => (
            <div key={a.title} className="flex flex-col rounded-3xl border border-zinc-200/80 bg-white p-7 shadow-soft">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-md shadow-orange-500/25"><a.icon className="size-5" /></span>
              <div className="text-sm font-semibold uppercase tracking-wide text-orange-600">{a.title}</div>
              <div className="mt-1 text-xl font-semibold text-zinc-900">{a.lead}</div>
              <div className="mt-3 text-sm text-zinc-500">
                {a.pricePrefix}<b className="text-2xl font-bold text-zinc-900">{a.price}</b> por disparo
              </div>
              <ul className="mt-4 flex-1 space-y-2">
                {a.points.map((pt) => (
                  <li key={pt} className="flex items-start gap-2 text-sm text-zinc-600"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {pt}</li>
                ))}
              </ul>
              <a href={waTo(a.msg)} className="mt-6 inline-flex items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 font-medium text-white hover:opacity-90">
                {a.cta} <ArrowRight className="size-4" />
              </a>
            </div>
          ))}
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-orange-600">Diferenciais</div>
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">O que o Fuzil faz sozinho</h2>
        <p className="mt-2 max-w-2xl text-zinc-500">Nas plataformas tradicionais, cada conta é uma ilha e o trabalho repetitivo fica com você. No Fuzil, as BMs trabalham juntas.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {DIFFS.map((f) => (
            <div key={f.title} className="group relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift">
              <span className="absolute inset-x-0 top-0 h-1 bg-brand-gradient opacity-0 transition group-hover:opacity-100" />
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-md shadow-orange-500/25"><f.icon className="size-5" /></span>
              <div className="text-lg font-semibold text-zinc-900">{f.title}</div>
              <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{f.text}</p>
              <span className="mt-4 inline-block rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700 ring-1 ring-orange-200">{f.tag}</span>
            </div>
          ))}
        </div>
      </section>

      <section id="comparar" className="scroll-mt-20 bg-zinc-50">
        <div className="mx-auto max-w-5xl px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Lado a lado</h2>
          <p className="mt-2 max-w-2xl text-zinc-500">Como costuma ser nas plataformas tradicionais de disparo e como é no {c.brand}.</p>
          <div className="mt-8 overflow-hidden rounded-2xl bg-white shadow-soft ring-1 ring-zinc-200/70">
            <div className="grid grid-cols-[1.1fr_1fr_1.2fr] border-b border-zinc-200 bg-zinc-100 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-600">
              <span />
              <span>Tradicional</span>
              <span className="text-orange-700">{c.brand}</span>
            </div>
            {COMPARE.map(([what, old, ours]) => (
              <div key={what} className="grid grid-cols-[1.1fr_1fr_1.2fr] items-center gap-3 border-b border-zinc-100 px-5 py-4 text-sm last:border-0">
                <span className="font-semibold text-zinc-900">{what}</span>
                <span className="text-zinc-500">{old}</span>
                <span className="flex items-start gap-2 font-medium text-zinc-900"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {ours}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">E mais</h2>
        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {MORE.map((f) => (
            <div key={f.title} className="rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-soft">
              <span className="mb-3 flex size-10 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><f.icon className="size-5" /></span>
              <div className="font-semibold text-zinc-900">{f.title}</div>
              <p className="mt-1.5 text-sm text-zinc-500">{f.text}</p>
            </div>
          ))}
        </div>
      </section>

      <section id="como-funciona" className="scroll-mt-20 bg-zinc-50">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Como funciona</h2>
          <div className="mt-10 grid gap-5 md:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title} className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-zinc-200/70">
                <span className="mb-4 flex size-9 items-center justify-center rounded-full bg-brand-gradient text-sm font-semibold text-white">{i + 1}</span>
                <div className="font-semibold text-zinc-900">{s.title}</div>
                <p className="mt-1.5 text-sm text-zinc-500">{s.text}</p>
              </div>
            ))}
          </div>
          <p className="mt-8 max-w-3xl text-sm text-zinc-500">
            Os envios seguem a Política Comercial e a Política de Mensagens do WhatsApp Business: só para pessoas que autorizaram o contato, com opção de descadastro (basta responder SAIR) respeitada automaticamente.
          </p>
        </div>
      </section>

      <section id="preco" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <div className="mb-3 text-sm font-semibold uppercase tracking-wider text-orange-600">Preço</div>
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Paga só o que enviar</h2>
        <p className="mt-2 max-w-2xl text-zinc-500">Sem mensalidade, sem plano e sem fidelidade. Você coloca crédito pelo Pix e usa quando quiser.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="flex flex-col rounded-3xl border border-zinc-200/80 bg-white p-8 shadow-soft">
            <div className="text-sm font-semibold uppercase tracking-wide text-orange-600">Empresas com BM própria</div>
            <div className="mt-3 flex items-end gap-2">
              <span className="text-5xl font-bold tracking-tight text-zinc-900">R$ 0,01</span>
              <span className="pb-1.5 text-zinc-500">por disparo</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-zinc-600">
              {["Sem mensalidade: é o único valor cobrado pelo Fuzil", "Mensagem que não sai volta como crédito", "Crédito pelo Pix, cai na hora", "Todas as funções incluídas: chat, fluxos, relatório"].map((t) => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" /> {t}</li>
              ))}
            </ul>
            <a href={waTo(AUDIENCES[0].msg)} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-ink px-5 py-3 font-medium text-white hover:opacity-90">
              Quero usar com minhas BMs <ArrowRight className="size-4" />
            </a>
            <p className="mt-4 text-xs leading-relaxed text-zinc-500">
              A Meta (dona do WhatsApp) cobra a parte dela por mensagem direto no cartão da sua conta, conforme a tabela oficial do WhatsApp Business.
            </p>
          </div>
          <div className="flex flex-col rounded-3xl bg-ink p-8 text-white shadow-lift">
            <div className="text-sm font-semibold uppercase tracking-wide text-orange-300">Disparo pronto</div>
            <div className="mt-3 flex items-end gap-2">
              <span className="pb-1.5 text-zinc-400">a partir de</span>
              <span className="text-5xl font-bold tracking-tight">R$ 0,20</span>
              <span className="pb-1.5 text-zinc-400">por disparo</span>
            </div>
            <ul className="mt-6 flex-1 space-y-2.5 text-sm text-zinc-300">
              {["A gente cuida de tudo: modelo, aprovação e disparo", "Você não precisa ter conta na Meta", "Relatório ao vivo da sua campanha", "Sem mensalidade: paga por campanha"].map((t) => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-400" /> {t}</li>
              ))}
            </ul>
            <a href={waTo(AUDIENCES[1].msg)} className="mt-7 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 font-medium">
              Quero contratar disparos <ArrowRight className="size-4" />
            </a>
            <p className="mt-4 text-xs leading-relaxed text-zinc-500">O valor final depende da quantidade e do tipo de mensagem. Fale com a gente para um orçamento.</p>
          </div>
        </div>
      </section>

      {TESTIMONIALS.length > 0 && (
        <section id="depoimentos" className="scroll-mt-20 bg-zinc-50">
          <div className="mx-auto max-w-6xl px-5 py-20">
            <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Quem usa</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="rounded-2xl bg-white p-6 shadow-soft ring-1 ring-zinc-200/70">
                  <Quote className="size-5 text-orange-500" />
                  <blockquote className="mt-3 text-sm leading-relaxed text-zinc-700">{t.text}</blockquote>
                  <figcaption className="mt-4 text-sm"><b className="text-zinc-900">{t.name}</b><span className="block text-zinc-500">{t.role}</span></figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      <section id="contato" className="mx-auto max-w-6xl scroll-mt-20 px-5 pb-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink p-10 text-white">
          <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-orange-500/25 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight">Pronto para disparar?</h2>
            <p className="mt-2 max-w-xl text-zinc-300">Conte como é a sua operação: a gente te ajuda a conectar a primeira conta e fazer o primeiro disparo.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href={wa} className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-3 font-medium">
                Falar com a gente no WhatsApp <ArrowRight className="size-4" />
              </a>
              {c.email && <a href={`mailto:${c.email}`} className="rounded-xl bg-white/10 px-5 py-3 font-medium ring-1 ring-white/15 hover:bg-white/15">{c.email}</a>}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
