// Convites de BM que chegam por e-mail: acha o link do convite e o nome da BM, e testa se o link responde.

/** Nome da BM normalizado para comparar (sem acento, minúsculo, espaços simples). */
export function normalizeBmName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&#x3D;|&#61;/g, "=")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");

/** Link do convite no corpo do e-mail da Meta (business.facebook.com/invitation/?token=... e parecidos). */
export function findInviteUrl(text: string): string | null {
  const body = decodeEntities(text);
  // Sem colchetes: a versão em texto do e-mail escreve "Aceitar convite [https://...]"
  const urls = body.match(/https?:\/\/[^\s"'<>()[\]{}]+/g) ?? [];
  const meta = urls.filter((u) => /^https?:\/\/([a-z0-9-]+\.)*(facebook\.com|fb\.me|fb\.com)\//i.test(u));
  // Link de convite de verdade (não o de "ajuda", "descadastrar" etc.)
  const invite =
    meta.find((u) => /\/invitation\/?\?[^ ]*token=/i.test(u)) ??
    meta.find((u) => /invit|convite|accept/i.test(u) && !/unsubscribe|help|privacy|policies|settings|notification/i.test(u));
  return invite ? invite.replace(/[.,;]+$/, "") : null;
}

/** Nome da BM no assunto (ou no corpo) do convite. Ex.: "Fulano convidou você para participar de Loja X no Meta Business Suite". */
export function findBmName(subject: string, text = ""): string | null {
  const s = subject.replace(/\s+/g, " ").trim();
  const patterns = [
    /(?:participar|fazer parte) (?:do|da|de) (?:portf[oó]lio empresarial )?["“]?(.+?)["”]? (?:no|na|em) (?:Meta|Gerenciador|Business|Facebook)/i,
    /(?:acessar|acesso a|acesso ao|acesso à) (?:o |a )?(?:portf[oó]lio empresarial )?["“]?(.+?)["”]? (?:no|na|em) (?:Meta|Gerenciador|Business|Facebook)/i,
    /join (?:the business portfolio )?["“]?(.+?)["”]? on (?:Meta|Facebook|Business)/i,
    /access (?:to )?(?:the business portfolio )?["“]?(.+?)["”]? on (?:Meta|Facebook|Business)/i,
    /(?:convite|invitation|invite) (?:para|to|for) (?:participar de |join |acessar )?["“]?(.+?)["”]?$/i,
  ];
  for (const re of patterns) {
    const m = s.match(re) ?? text.replace(/\s+/g, " ").match(re);
    if (m?.[1] && m[1].length <= 120) return m[1].trim();
  }
  return null;
}

/** Junta tudo que dá para ler do e-mail. */
export function parseInviteEmail(input: { subject: string; text?: string | null; html?: string | null }): { url: string | null; bmName: string | null } {
  const body = `${input.text ?? ""}\n${input.html ?? ""}`;
  const plain = (input.text ?? "") || (input.html ?? "").replace(/<[^>]+>/g, " ");
  return { url: findInviteUrl(body), bmName: findBmName(input.subject, decodeEntities(plain)) };
}

const INVALID = [/expir/i, /n[aã]o (?:é|est[aá]) mais (?:v[aá]lido|dispon[ií]vel)/i, /no longer (?:valid|available)/i, /invalid/i, /inv[aá]lido/i, /j[aá] foi (?:aceito|usado)/i, /already (?:been )?(?:accepted|used)/i];

/**
 * Testa se o link do convite responde e não mostra "expirado/inválido".
 * O teste é sem login no Facebook: confirma que o link existe e não morreu, mas não aceita o convite.
 */
export async function checkInviteLink(url: string, fetcher: typeof fetch = fetch): Promise<{ check: "OK" | "INVALID" | "UNKNOWN"; note: string }> {
  try {
    const res = await fetcher(url, {
      redirect: "follow",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36", "Accept-Language": "pt-BR,pt;q=0.9" },
      signal: AbortSignal.timeout(20_000),
    });
    if (res.status === 404 || res.status === 410) return { check: "INVALID", note: `A Meta respondeu ${res.status} (link não existe)` };
    if (res.status >= 500) return { check: "UNKNOWN", note: `A Meta respondeu ${res.status}: testo de novo depois` };
    const html = (await res.text()).slice(0, 400_000);
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] ?? "";
    const visible = `${title} ${html.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " ")}`.slice(0, 60_000);
    if (INVALID.some((re) => re.test(visible))) return { check: "INVALID", note: "A página do convite diz que ele expirou ou não é válido" };
    if (res.status >= 400) return { check: "UNKNOWN", note: `A Meta respondeu ${res.status}` };
    return { check: "OK", note: "Link responde (pede login no Facebook para aceitar)" };
  } catch (e) {
    return { check: "UNKNOWN", note: `Não consegui abrir o link agora (${e instanceof Error ? e.message : String(e)})` };
  }
}
