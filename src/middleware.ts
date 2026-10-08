import { NextResponse, type NextRequest } from "next/server";

/**
 * Quando o acesso vem pelo domínio curto dos links (REDIRECT_DOMAIN),
 * https://dominio/abc123 é tratado como https://painel/r/abc123.
 */
export function middleware(req: NextRequest) {
  const redirectHost = (process.env.REDIRECT_DOMAIN ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const appHost = (process.env.APP_URL ?? "").replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  const host = req.headers.get("host") ?? "";
  if (!redirectHost || redirectHost === appHost || host !== redirectHost) return NextResponse.next();

  const m = req.nextUrl.pathname.match(/^\/([A-Za-z0-9]{4,32})\/?$/);
  if (m) {
    const url = req.nextUrl.clone();
    url.pathname = `/r/${m[1]}`;
    return NextResponse.rewrite(url);
  }
  return new NextResponse("Not found", { status: 404 });
}

export const config = { matcher: ["/((?!_next|r/|api/|media/).*)"] };
