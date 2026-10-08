import { BarChart3, Bell, CheckCircle2, Layers, Link2, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Logo } from "@/components/brand";
import { company } from "@/lib/company";

const FEATURES = [
  { icon: Layers, title: "Várias contas, um disparo só", text: "Conecte quantas contas do WhatsApp Business precisar e agrupe-as. Cada campanha distribui os envios entre todos os números do grupo, respeitando o limite de cada conta." },
  { icon: ShieldCheck, title: "Só mensagens de utilidade", text: "Avisos de pedido, lembretes e confirmações. A plataforma confere a categoria de cada modelo antes de enviar e bloqueia qualquer modelo classificado como marketing." },
  { icon: Sparkles, title: "Modelos padronizados", text: "Crie um modelo de mensagem uma vez e ele é cadastrado em todas as suas contas, inclusive nas que você conectar depois." },
  { icon: Link2, title: "Links com contagem de cliques", text: "Cada destinatário recebe um link único. Você vê quem clicou, sem contar robôs de pré-visualização." },
  { icon: BarChart3, title: "Métricas completas", text: "Enviadas, entregues, lidas, cliques, respostas, descadastros e falhas por motivo, por campanha e por número. Exportação em planilha." },
  { icon: Bell, title: "Alertas de qualidade e limite", text: "Aviso imediato quando a qualidade de um número cai, quando o limite diário é atingido ou quando um modelo muda de categoria." },
];

const STEPS = [
  { title: "Conecte suas contas", text: "Pelo cadastro oficial da Meta (Embedded Signup), em poucos cliques, sem compartilhar senhas." },
  { title: "Crie o modelo de mensagem", text: "Monte o modelo de utilidade com pré-visualização e envie para aprovação da Meta." },
  { title: "Suba sua lista e dispare", text: "Importe a planilha dos seus clientes, revise e envie agora ou agende. Acompanhe tudo em tempo real." },
];

export default function SitePage() {
  const c = company();
  const whatsapp = c.phone.replace(/\D/g, "");
  return (
    <>
      <section className="relative overflow-hidden bg-ink text-white">
        <div className="pointer-events-none absolute -left-40 -top-40 size-[560px] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-56 -right-40 size-[560px] rounded-full bg-rose-600/20 blur-3xl" />
        <div className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-[1.2fr_1fr] md:py-28">
          <div>
            <div className="mb-5 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-200">
              <Zap className="size-3.5" /> API oficial do WhatsApp Business
            </div>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Mensagens de utilidade em escala, <span className="bg-brand-gradient bg-clip-text text-transparent">com controle total</span>.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-zinc-300">
              O {c.brand} é uma plataforma para empresas gerenciarem suas contas do WhatsApp Business e enviarem avisos, lembretes e confirmações para seus clientes pela Cloud API oficial.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a href="#contato" className="rounded-xl bg-brand-gradient px-5 py-3 font-medium text-white shadow-lg shadow-orange-500/20">Quero usar</a>
              <a href={`${c.appUrl}/login`} className="rounded-xl bg-white/10 px-5 py-3 font-medium text-white ring-1 ring-white/15 hover:bg-white/15">Já sou cliente</a>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-3xl bg-white/5 p-8 ring-1 ring-white/10">
              <Logo className="w-full" />
              <ul className="mt-8 space-y-3 text-zinc-300">
                {["Distribuição entre várias contas e números", "Bloqueio automático de modelos de marketing", "Cliques, leituras e respostas em tempo real"].map((t) => (
                  <li key={t} className="flex items-center gap-3"><CheckCircle2 className="size-5 shrink-0 text-orange-400" /> {t}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section id="recursos" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <h2 className="text-3xl font-semibold tracking-tight text-zinc-900">Recursos</h2>
        <p className="mt-2 max-w-2xl text-zinc-500">Tudo o que sua operação precisa para enviar comunicações transacionais com segurança e qualidade.</p>
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-2xl border border-zinc-200/80 bg-white p-6 shadow-soft">
              <span className="mb-4 flex size-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600"><f.icon className="size-5" /></span>
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

      <section id="contato" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20">
        <div className="relative overflow-hidden rounded-3xl bg-ink p-10 text-white">
          <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-orange-500/25 blur-3xl" />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight">Fale com a gente</h2>
            <p className="mt-2 max-w-xl text-zinc-300">Conte o volume de mensagens da sua empresa e montamos o acesso para você.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {whatsapp && <a href={`https://wa.me/${whatsapp}`} className="rounded-xl bg-brand-gradient px-5 py-3 font-medium">WhatsApp {c.phone}</a>}
              {c.email && <a href={`mailto:${c.email}`} className="rounded-xl bg-white/10 px-5 py-3 font-medium ring-1 ring-white/15 hover:bg-white/15">{c.email}</a>}
              {!whatsapp && !c.email && <span className="text-zinc-400">Contato em breve.</span>}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
