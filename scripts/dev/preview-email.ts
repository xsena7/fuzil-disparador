// Gera prévias HTML dos e-mails (não envia nada): npx tsx scripts/dev/preview-email.ts <pasta>
import { writeFileSync } from "node:fs";
import { emailLayout } from "../../src/lib/email";

const out = process.argv[2] ?? ".";
const invite = emailLayout({
  preheader: "Sua conta no Fuzil Disparador está pronta.",
  title: "Bem-vindo ao Fuzil Disparador, Felipe! 🚀",
  paragraphs: [
    "<b>Guilherme</b> criou uma conta para você em <b>Operação Felipe</b> no <b>Fuzil Disparador</b>, a plataforma de disparos pela API oficial do WhatsApp.",
    "Lá você conecta suas BMs, acompanha qualidade e limite de cada número e dispara campanhas com relatório completo de entregas, leituras, cliques e respostas.",
    "Para começar, é só criar sua senha no botão abaixo:",
  ],
  cta: { label: "Criar minha senha", url: "https://app.fuzildisparador.com.br/definir-senha?token=abc123" },
  note: "Seu login é <b>felipe@exemplo.com</b>. Este link vale por 7 dias. Se você não esperava este convite, pode ignorar este e-mail.",
});
const alert = emailLayout({
  preheader: "Template recategorizado",
  title: '🚨 Template "atualizacao_pedido" recategorizado: UTILITY → MARKETING',
  paragraphs: ["WABA BM Felipe / WABA Felipe. Esse template NÃO será mais usado em disparos nessa WABA.", "Conta: <b>Operação Guilherme</b>"],
  cta: { label: "Ver no painel", url: "https://app.fuzildisparador.com.br/alertas" },
  note: "Você recebe por e-mail só os alertas críticos. Dá para desligar em Configurações.",
  tone: "danger",
});
writeFileSync(`${out}/email-convite.html`, invite.html);
writeFileSync(`${out}/email-alerta.html`, alert.html);
