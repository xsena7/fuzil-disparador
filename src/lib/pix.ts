// Pix "copia e cola" (BR Code, padrão EMV do Banco Central) com valor já preenchido.

const field = (id: string, value: string) => `${id}${String(value.length).padStart(2, "0")}${value}`;

/** Tira acento e caractere especial (o BR Code só aceita ASCII simples no nome e na cidade). */
const clean = (v: string, max: number) =>
  v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^A-Za-z0-9 .\-]/g, "")
    .trim()
    .slice(0, max);

function crc16(payload: string) {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Chave do jeito que o Pix espera: celular com +55, CPF/CNPJ só números, e-mail e aleatória como estão. */
export function normalizePixKey(raw: string) {
  const k = raw.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(k)) return k.toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(k)) return k.toLowerCase();
  const digits = k.replace(/\D/g, "");
  if (k.startsWith("+")) return `+${digits}`;
  if (digits.length === 11 && /[()\s-]/.test(k) && !/[.]/.test(k)) return `+55${digits}`; // (11) 99999-8888
  if (digits.length === 13 && digits.startsWith("55")) return `+${digits}`;
  return digits || k;
}

export function pixPayload({ key, name, city, amount, txid = "***" }: { key: string; name: string; city: string; amount?: number; txid?: string }) {
  const account = field("00", "br.gov.bcb.pix") + field("01", normalizePixKey(key));
  let p = field("00", "01") + field("26", account) + field("52", "0000") + field("53", "986");
  if (amount && amount > 0) p += field("54", amount.toFixed(2));
  p += field("58", "BR") + field("59", clean(name, 25) || "RECEBEDOR") + field("60", clean(city, 15) || "BRASIL");
  p += field("62", field("05", clean(txid, 25).replace(/\s/g, "") || "***"));
  p += "6304";
  return p + crc16(p);
}
