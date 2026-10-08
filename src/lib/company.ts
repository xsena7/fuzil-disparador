import { cachedSetting } from "./settings-cache";

/** Dados públicos da empresa dona do Fuzil (editáveis em Admin → Empresa). */
export function company() {
  const get = (k: string) => cachedSetting(k)?.trim() || "";
  return {
    brand: "Fuzil Disparador",
    legalName: get("COMPANY_LEGAL_NAME"),
    cnpj: get("COMPANY_CNPJ") || "68.690.526/0001-84",
    address: get("COMPANY_ADDRESS"),
    email: get("COMPANY_EMAIL"),
    phone: get("COMPANY_PHONE"),
    domainVerification: get("META_DOMAIN_VERIFICATION"),
    siteUrl: `https://${(process.env.SITE_DOMAIN || "fuzildisparador.com.br").replace(/^https?:\/\//, "")}`,
    appUrl: process.env.APP_URL || "https://app.fuzildisparador.com.br",
  };
}

/** "RAZÃO SOCIAL, CNPJ 00.000.000/0000-00" (ou só o CNPJ enquanto a razão social não foi preenchida). */
export function ownerLine() {
  const c = company();
  return c.legalName ? `${c.legalName}, inscrita no CNPJ ${c.cnpj}` : `empresa inscrita no CNPJ ${c.cnpj}`;
}
