import { NextResponse, type NextRequest } from "next/server";

const hostOf = (v?: string) => (v ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");

/**
 * - Domínio curto dos links (REDIRECT_DOMAIN): https://dominio/abc123 vira https://painel/r/abc123.
 * - Domínio principal (SITE_DOMAIN, ex.: fuzildisparador.com.br): mostra o site público (/site/...).
 */
export function middleware(req: NextRequest) {
  const redirectHost = hostOf(process.env.REDIRECT_DOMAIN);
  const appHost = hostOf(process.env.APP_URL);
  const siteHost = hostOf(process.env.SITE_DOMAIN || "fuzildisparador.com.br");
  const host = (req.headers.get("host") ?? "").replace(/:\d+$/, "");
  const path = req.nextUrl.pathname;

  if (host === siteHost || host === `www.${siteHost}`) {
    if (host.startsWith("www.")) {
      const url = req.nextUrl.clone();
      url.host = siteHost;
      url.port = "";
      return NextResponse.redirect(url, 308);
    }
    // Arquivos (logo, prints, favicon) seguem normais; páginas vão para /site
    if (/\.[a-z0-9]+$/i.test(path) || path.startsWith("/site")) return NextResponse.next();
    const url = req.nextUrl.clone();
    url.pathname = path === "/" ? "/site" : `/site${path}`;
    return NextResponse.rewrite(url);
  }

  if (!redirectHost || redirectHost === appHost || host !== redirectHost) return NextResponse.next();

  const m = path.match(/^\/([A-Za-z0-9]{4,32})\/?$/);
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = `/r/${m[1]}`;
    return NextResponse.rewrite(url);
  }
  return new NextResponse("Not found", { status: 404 });
}

export const config = { matcher: ["/((?!_next|r/|api/|media/).*)"] };
