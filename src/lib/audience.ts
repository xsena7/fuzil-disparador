import Papa from "papaparse";
import { normalizePhone } from "./phone";

const PHONE_KEYS = ["telefone", "phone", "celular", "whatsapp", "numero", "número", "fone", "tel", "número de telefone", "numero de telefone", "contato"];
const NAME_KEYS = ["nome", "name", "cliente", "primeiro nome", "nome completo"];
const DDI_KEYS = ["ddi", "codigo do pais", "código do país", "country code", "pais", "país"];
const EMAIL_KEYS = ["email", "e-mail", "mail"];

function norm(s: string) {
  return s.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function findKey(headers: string[], keys: string[]) {
  const nk = keys.map(norm);
  return headers.find((h) => nk.includes(norm(h))) ?? headers.find((h) => nk.some((k) => norm(h).includes(k)));
}

export type ParsedAudience = {
  rows: Array<{ phone: string; name: string | null; data: Record<string, string> }>;
  headers: string[];
  stats: { totalLines: number; valid: number; invalid: number; duplicates: number; invalidSamples: string[] };
  columns: { phone?: string; name?: string; ddi?: string; email?: string };
};

export function parseAudienceCsv(text: string): ParsedAudience {
  const firstLine = text.split(/\r?\n/, 1)[0] ?? "";
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ",";
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^﻿/, ""), { header: true, skipEmptyLines: "greedy", delimiter });
  let headers = (parsed.meta.fields ?? []).filter(Boolean);
  let records = parsed.data;

  let phoneKey = findKey(headers, PHONE_KEYS);
  // Sem cabeçalho reconhecível: procura a coluna que parece telefone
  if (!phoneKey) {
    const raw = Papa.parse<string[]>(text, { header: false, skipEmptyLines: "greedy", delimiter }).data;
    const width = Math.max(...raw.map((r) => r.length));
    let best = -1;
    let bestScore = 0;
    for (let col = 0; col < width; col++) {
      const score = raw.slice(0, 50).filter((r) => normalizePhone(r[col] ?? "")).length;
      if (score > bestScore) { bestScore = score; best = col; }
    }
    if (best >= 0) {
      headers = Array.from({ length: width }, (_, i) => (i === best ? "telefone" : `coluna${i + 1}`));
      records = raw.map((r) => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? ""])));
      phoneKey = "telefone";
    }
  }
  const nameKey = findKey(headers, NAME_KEYS);
  const ddiKey = findKey(headers, DDI_KEYS);
  const emailKey = findKey(headers, EMAIL_KEYS);

  const seen = new Set<string>();
  const out: ParsedAudience = {
    rows: [],
    headers,
    stats: { totalLines: records.length, valid: 0, invalid: 0, duplicates: 0, invalidSamples: [] },
    columns: { phone: phoneKey, name: nameKey, ddi: ddiKey, email: emailKey },
  };
  for (const rec of records) {
    const rawPhone = phoneKey ? rec[phoneKey] ?? "" : "";
    const phone = normalizePhone(rawPhone, "55", ddiKey ? rec[ddiKey] : undefined);
    if (!phone) {
      out.stats.invalid++;
      if (out.stats.invalidSamples.length < 20) out.stats.invalidSamples.push(rawPhone || "(vazio)");
      continue;
    }
    if (seen.has(phone)) { out.stats.duplicates++; continue; }
    seen.add(phone);
    const data: Record<string, string> = {};
    for (const h of headers) data[h] = String(rec[h] ?? "").trim();
    if (emailKey) data.email = data[emailKey];
    out.rows.push({ phone, name: nameKey ? String(rec[nameKey] ?? "").trim() || null : null, data });
  }
  out.stats.valid = out.rows.length;
  return out;
}
