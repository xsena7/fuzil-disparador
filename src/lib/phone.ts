/**
 * Normaliza telefones para o formato aceito pela Cloud API: só dígitos, com DDI.
 * Retorna null quando o número é claramente inválido.
 */
export function normalizePhone(raw: string, defaultCountry = "55", countryCode?: string): string | null {
  let digits = String(raw ?? "").replace(/\D/g, "");
  const ddi = String(countryCode ?? "").replace(/\D/g, "");
  if (!digits) return null;
  digits = digits.replace(/^00/, "");

  if (ddi && !digits.startsWith(ddi)) digits = ddi + digits;

  if (!ddi) {
    // Sem DDI explícito: só vira Brasil se tiver cara de número brasileiro (DDD que existe + celular com 9 ou fixo).
    // Senão é internacional com o DDI na frente (ex.: 33744635335 = França, 15069625913 = Canadá)
    if ((digits.length === 10 || digits.length === 11) && looksBrazilian(digits)) digits = defaultCountry + digits;
    // Número com 0 de operadora/DDD na frente (ex.: 011999998888)
    else if (digits.startsWith("0") && (digits.length === 11 || digits.length === 12)) digits = defaultCountry + digits.slice(1);
  }

  if (digits.startsWith("55")) {
    const national = digits.slice(2);
    if (national.length !== 10 && national.length !== 11) return null;
    const ddd = Number(national.slice(0, 2));
    if (ddd < 11 || ddd > 99) return null;
    if (national.length === 11 && national[2] !== "9") return null;
    // Sempre no formato do WhatsApp: celular sem o 9 na frente ganha o 9 (fixo continua igual)
    return canonicalWaId(digits);
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

// DDDs que existem no Brasil
const BR_DDD = new Set([11, 12, 13, 14, 15, 16, 17, 18, 19, 21, 22, 24, 27, 28, 31, 32, 33, 34, 35, 37, 38, 41, 42, 43, 44, 45, 46, 47, 48, 49, 51, 53, 54, 55, 61, 62, 63, 64, 65, 66, 67, 68, 69, 71, 73, 74, 75, 77, 79, 81, 82, 83, 84, 85, 86, 87, 88, 89, 91, 92, 93, 94, 95, 96, 97, 98, 99]);

/** 10 ou 11 dígitos sem DDI que formam um número do Brasil: DDD válido + celular (9 na frente) ou fixo/celular antigo. */
function looksBrazilian(n: string) {
  if (!BR_DDD.has(Number(n.slice(0, 2)))) return false;
  return n.length === 11 ? n[2] === "9" : /[2-9]/.test(n[2]);
}

export function formatPhone(digits: string): string {
  if (digits.startsWith("55") && (digits.length === 12 || digits.length === 13)) {
    const n = digits.slice(2);
    const ddd = n.slice(0, 2);
    const rest = n.slice(2);
    return `+55 ${ddd} ${rest.slice(0, rest.length - 4)}-${rest.slice(-4)}`;
  }
  return `+${digits}`;
}

/**
 * A Meta costuma mandar celulares do Brasil sem o 9 (55 11 8888-7777). Os destinatários são gravados com o 9,
 * então o número que chega no webhook é colocado no mesmo formato (senão SAIR, respostas e Chat não batem).
 */
export function canonicalWaId(waId: string): string {
  const d = String(waId ?? "").replace(/\D/g, "");
  if (/^55\d{10}$/.test(d) && /[6-9]/.test(d[4])) return `${d.slice(0, 4)}9${d.slice(4)}`;
  return d;
}
