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
    // Sem DDI explícito: números brasileiros com 10/11 dígitos (DDD + número)
    if (digits.length === 10 || digits.length === 11) digits = defaultCountry + digits;
    // Número com 0 de operadora/DDD na frente (ex.: 011999998888)
    else if (digits.startsWith("0") && (digits.length === 11 || digits.length === 12)) digits = defaultCountry + digits.slice(1);
  }

  if (digits.startsWith("55")) {
    const national = digits.slice(2);
    if (national.length !== 10 && national.length !== 11) return null;
    const ddd = Number(national.slice(0, 2));
    if (ddd < 11 || ddd > 99) return null;
    if (national.length === 11 && national[2] !== "9") return null;
    return digits;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
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
