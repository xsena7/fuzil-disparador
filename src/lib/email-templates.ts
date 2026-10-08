import { emailLayout, sendEmail } from "./email";
import { env } from "./env";

const first = (name: string) => name.trim().split(/\s+/)[0] || name;

export function sendInviteEmail(to: string, name: string, company: string, link: string, invitedBy?: string) {
  const { html, text } = emailLayout({
    preheader: `Sua conta no Fuzil Disparador está pronta. Crie sua senha para entrar.`,
    title: `Bem-vindo ao Fuzil Disparador, ${first(name)}! 🚀`,
    paragraphs: [
      `${invitedBy ? `<b>${invitedBy}</b> criou` : "Foi criada"} uma conta para você${company ? ` em <b>${company}</b>` : ""} no <b>Fuzil Disparador</b>, a plataforma de disparos pela API oficial do WhatsApp.`,
      "Lá você conecta suas BMs, acompanha qualidade e limite de cada número e dispara campanhas com relatório completo de entregas, leituras, cliques e respostas.",
      "Para começar, é só criar sua senha no botão abaixo:",
    ],
    cta: { label: "Criar minha senha", url: link },
    note: `Seu login é <b>${to}</b>. Este link vale por 7 dias. Se você não esperava este convite, pode ignorar este e-mail.`,
  });
  return sendEmail({ to, subject: "Sua conta no Fuzil Disparador está pronta", html, text });
}

export function sendResetEmail(to: string, name: string, link: string) {
  const { html, text } = emailLayout({
    preheader: "Recebemos um pedido para redefinir sua senha.",
    title: `Redefinir sua senha`,
    paragraphs: [`Oi, ${first(name)}! Recebemos um pedido para redefinir a senha da sua conta no Fuzil Disparador.`, "Clique no botão para escolher uma nova senha:"],
    cta: { label: "Redefinir senha", url: link },
    note: "Este link vale por 2 horas. Se não foi você que pediu, ignore este e-mail — sua senha continua a mesma.",
  });
  return sendEmail({ to, subject: "Redefinir senha · Fuzil Disparador", html, text });
}

export function sendWelcomeEmail(to: string, name: string) {
  const { html, text } = emailLayout({
    preheader: "Sua conta foi criada. Bora conectar a primeira BM.",
    title: `Conta criada, ${first(name)}! 🎯`,
    paragraphs: [
      "Sua conta no <b>Fuzil Disparador</b> está ativa.",
      "Próximos passos: conecte suas BMs em <b>Conexões</b>, monte um <b>grupo de BM</b> e crie sua primeira campanha.",
    ],
    cta: { label: "Abrir o painel", url: env.appUrl() },
  });
  return sendEmail({ to, subject: "Bem-vindo ao Fuzil Disparador", html, text });
}

export function sendCriticalAlertEmail(to: string[], workspace: string, title: string, message: string) {
  const { html, text } = emailLayout({
    preheader: title,
    title: `🚨 ${title}`,
    paragraphs: [message, `Conta: <b>${workspace}</b>`],
    cta: { label: "Ver no painel", url: `${env.appUrl()}/alertas` },
    note: "Você recebe por e-mail só os alertas críticos. Dá para desligar em Configurações.",
    tone: "danger",
  });
  return sendEmail({ to, subject: `[Fuzil] ${title}`, html, text });
}

export function sendTestEmail(to: string) {
  const { html, text } = emailLayout({
    preheader: "Teste de envio do Fuzil Disparador.",
    title: "E-mails funcionando ✅",
    paragraphs: ["Se você está lendo isto, o envio de e-mails do Fuzil Disparador está configurado corretamente."],
    cta: { label: "Abrir o painel", url: env.appUrl() },
  });
  return sendEmail({ to, subject: "Teste · Fuzil Disparador", html, text });
}
