// Servidor de e-mail do Fuzil (só recebe): os e-mails do domínio chegam aqui pela porta 25 e vão para a aba E-mails.
// Só aceita endereços que existem no Fuzil (não é relay: nunca repassa e-mail para fora).
import { SMTPServer } from "smtp-server";
import { simpleParser } from "mailparser";
import { prisma } from "../lib/db";
import { mailDomain, storeIncoming } from "../lib/mail";
import { startSettingsRefresh } from "../lib/platform-settings";

const PORT = Number(process.env.MAIL_PORT || 2525);
const MAX_SIZE = 25 * 1024 * 1024;

// Endereços existentes, com cache curto (a cada e-mail não precisa ir ao banco)
let known: { at: number; set: Set<string> } = { at: 0, set: new Set() };
async function exists(address: string) {
  if (Date.now() - known.at > 15_000) known = { at: Date.now(), set: new Set((await prisma.mailBox.findMany({ select: { address: true } })).map((b) => b.address)) };
  return known.set.has(address);
}

const server = new SMTPServer({
  name: `mail.${mailDomain()}`,
  banner: "Fuzil Disparador",
  authOptional: true,
  disabledCommands: ["AUTH"],
  size: MAX_SIZE,
  logger: false,
  // Sem chave própria, o STARTTLS usa o certificado padrão do servidor (quem manda e-mail aceita: o TLS entre servidores é oportunista)
  async onRcptTo(address, _session, cb) {
    const to = address.address.toLowerCase();
    if (!to.endsWith(`@${mailDomain()}`)) return cb(Object.assign(new Error("Não fazemos relay"), { responseCode: 554 }));
    if (!(await exists(to).catch(() => false))) return cb(Object.assign(new Error("Endereço não existe"), { responseCode: 550 }));
    cb();
  },
  onData(stream, session, cb) {
    const chunks: Buffer[] = [];
    let size = 0;
    stream.on("data", (c: Buffer) => {
      size += c.length;
      if (size <= MAX_SIZE) chunks.push(c);
    });
    stream.on("end", async () => {
      if ((stream as unknown as { sizeExceeded?: boolean }).sizeExceeded || size > MAX_SIZE) return cb(Object.assign(new Error("E-mail grande demais"), { responseCode: 552 }));
      try {
        const raw = Buffer.concat(chunks);
        const mail = await simpleParser(raw);
        const rcpts = session.envelope.rcptTo.map((r) => r.address.toLowerCase());
        const n = await storeIncoming(mail, rcpts, raw.length);
        console.log(`[mail] ${session.envelope.mailFrom ? session.envelope.mailFrom.address : "?"} → ${rcpts.join(", ")} (${n} caixa(s), ${raw.length} bytes)`);
        cb();
      } catch (e) {
        console.error("[mail] erro ao guardar", e);
        // 451 = erro temporário: o servidor de quem mandou tenta de novo depois
        cb(Object.assign(new Error("Erro temporário, tente de novo"), { responseCode: 451 }));
      }
    });
  },
});

server.on("error", (e) => console.error("[mail]", e.message));

async function main() {
  await startSettingsRefresh();
  server.listen(PORT, () => console.log(`[mail] recebendo e-mails de @${mailDomain()} na porta ${PORT}`));
  const stop = () => server.close(() => prisma.$disconnect().finally(() => process.exit(0)));
  process.on("SIGTERM", stop);
  process.on("SIGINT", stop);
}

main();
