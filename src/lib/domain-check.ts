import { Resolver } from "node:dns/promises";
import { env } from "./env";

/** DNS público (Cloudflare/Google): enxerga a propagação sem depender do cache do servidor. */
const resolver = new Resolver({ timeout: 2500, tries: 1 });
resolver.setServers(["1.1.1.1", "8.8.8.8"]);

async function ips(host: string): Promise<string[]> {
  try {
    return await Promise.race([resolver.resolve4(host), new Promise<string[]>((r) => setTimeout(() => r([]), 3000))]);
  } catch {
    return [];
  }
}

export type DomainCheck = {
  serverIps: string[];
  rootIps: string[];
  wwwIps: string[];
  rootOk: boolean;
  wwwOk: boolean;
  /** null = não testado */
  https: boolean | null;
};

/** Confere se o domínio (e o www) já apontam para o servidor e, opcionalmente, se o HTTPS já abre. */
export async function checkDomain(domain: string, testHttps = false): Promise<DomainCheck> {
  const appHost = env.appUrl().replace(/^https?:\/\//, "").replace(/[:/].*$/, "");
  const [serverIps, rootIps, wwwIps] = await Promise.all([ips(appHost), ips(domain), ips(`www.${domain}`)]);
  const points = (list: string[]) => list.length > 0 && serverIps.length > 0 && list.some((x) => serverIps.includes(x));
  const rootOk = points(rootIps);
  let https: boolean | null = null;
  if (testHttps && rootOk) {
    // A primeira visita também faz o Caddy gerar o certificado
    try {
      await fetch(`https://${domain}/`, { redirect: "manual", signal: AbortSignal.timeout(15_000), cache: "no-store" });
      https = true;
    } catch {
      https = false;
    }
  }
  return { serverIps, rootIps, wwwIps, rootOk, wwwOk: points(wwwIps), https };
}
