import { env } from "./env";

export function emailConfigured() {
  return Boolean(env.resendKey());
}

/** Envia um e-mail pelo Resend. Sem chave configurada, só registra no log e retorna false. */
export async function sendEmail(input: { to: string | string[]; subject: string; html: string; text: string }): Promise<boolean> {
  const key = env.resendKey();
  if (!key) {
    console.warn(`[email] RESEND_API_KEY não configurada — e-mail "${input.subject}" não enviado`);
    return false;
  }
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: env.emailFrom(), to: input.to, subject: input.subject, html: input.html, text: input.text }),
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) {
      console.error("[email] falha no envio", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[email] erro", err);
    return false;
  }
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/**
 * Layout padrão dos e-mails (tabelas + CSS inline, compatível com Gmail/Outlook).
 * `body` aceita parágrafos simples; `cta` vira o botão principal.
 */
export function emailLayout(opts: {
  preheader: string;
  title: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  note?: string;
  tone?: "brand" | "danger";
}): { html: string; text: string } {
  const app = env.appUrl();
  const accent = opts.tone === "danger" ? "#e11d48" : "#f97316";
  const paras = opts.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:24px;color:#3f3f46;">${p}</p>`)
    .join("");
  const button = opts.cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr><td style="border-radius:12px;background:#f97316;background-image:linear-gradient(135deg,#ff8a1f,#ef2d56);">
         <a href="${esc(opts.cta.url)}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:12px;">${esc(opts.cta.label)}</a>
       </td></tr></table>
       <p style="margin:12px 0 0;font-size:12px;line-height:18px;color:#a1a1aa;">Se o botão não funcionar, copie e cole este link no navegador:<br><a href="${esc(opts.cta.url)}" style="color:#ea580c;word-break:break-all;">${esc(opts.cta.url)}</a></p>`
    : "";
  const html = `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(opts.title)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f7;font-family:Inter,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f7;padding:32px 12px;">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="background:#0b0b0f;background-image:radial-gradient(circle at 0% 0%,rgba(249,115,22,.35),transparent 55%),radial-gradient(circle at 100% 100%,rgba(225,29,72,.30),transparent 55%);border-radius:20px 20px 0 0;padding:28px 32px;" align="center">
        <a href="${app}" style="text-decoration:none;"><img src="${app}/brand/logo-email.png" width="240" alt="FUZIL DISPARADOR" style="display:block;width:240px;max-width:100%;height:auto;border:0;"></a>
      </td></tr>
      <tr><td style="height:4px;background:${accent};background-image:linear-gradient(90deg,#ff8a1f,#ef2d56);"></td></tr>
      <tr><td style="background:#ffffff;padding:36px 32px 32px;border-radius:0 0 20px 20px;">
        <h1 style="margin:0 0 20px;font-size:22px;line-height:30px;font-weight:700;color:#18181b;">${esc(opts.title)}</h1>
        ${paras}
        ${button}
        ${opts.note ? `<p style="margin:28px 0 0;padding:14px 16px;background:#fafafa;border-radius:12px;font-size:13px;line-height:20px;color:#71717a;">${opts.note}</p>` : ""}
      </td></tr>
      <tr><td align="center" style="padding:24px 16px 0;font-size:12px;line-height:18px;color:#a1a1aa;">
        FUZIL DISPARADOR · Disparos pela API oficial do WhatsApp<br>
        <a href="${app}" style="color:#a1a1aa;">${app.replace(/^https?:\/\//, "")}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
  const strip = (s: string) => s.replace(/<br\s*\/?>/g, "\n").replace(/<[^>]+>/g, "");
  const text = [opts.title, "", ...opts.paragraphs.map(strip), opts.cta ? `\n${opts.cta.label}: ${opts.cta.url}` : "", opts.note ? `\n${strip(opts.note)}` : "", "\n— Fuzil Disparador"].join("\n");
  return { html, text };
}
