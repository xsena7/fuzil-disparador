"use client";

// Pixel da Meta no site público: só liga depois que o visitante aceita os cookies.
// Cada evento sai pelo navegador (fbq) e pelo servidor (/api/px) com o mesmo eventID.
// Eventos: PageView (toda página), ViewContent (viu os preços), AddToCart (escolheu um pacote/produto: data-px="AddToCart"),
// Contact (clicou no WhatsApp).
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Fbq = ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
declare global {
  interface Window {
    fbq?: Fbq;
    _fbq?: Fbq;
  }
}

const COOKIE = "fz_px";

function readConsent(): "1" | "0" | null {
  const m = document.cookie.match(/(?:^|; )fz_px=([01])/);
  return m ? (m[1] as "1" | "0") : null;
}

function saveConsent(v: "1" | "0") {
  // No domínio principal, vale também para o painel (app.) — o cadastro lá usa a mesma escolha
  const host = location.hostname;
  const parts = host.split(".");
  const root = host.endsWith(".com.br") ? parts.slice(-3).join(".") : parts.slice(-2).join(".");
  const domain = parts.length > 1 && !/^\d+$/.test(parts[parts.length - 1]) && host !== "localhost" ? `; domain=.${root}` : "";
  document.cookie = `${COOKIE}=${v}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax${domain}${location.protocol === "https:" ? "; Secure" : ""}`;
}

function loadPixel(id: string) {
  if (window.fbq) return;
  const f: Fbq = function (...args: unknown[]) {
    if (f.callMethod) f.callMethod(...args);
    else f.queue!.push(args);
  } as Fbq;
  f.push = f;
  f.loaded = true;
  f.version = "2.0";
  f.queue = [];
  window.fbq = f;
  window._fbq = f;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  document.head.appendChild(s);
  f("init", id);
}

const newId = () => (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`).replace(/[^\w-]/g, "");

function track(name: string, custom?: Record<string, string | number>) {
  if (!window.fbq) return;
  const eventId = newId();
  window.fbq("track", name, custom ?? {}, { eventID: eventId });
  const body = JSON.stringify({ name, eventId, url: location.href, custom });
  // sendBeacon não se perde quando o clique abre o WhatsApp
  if (!navigator.sendBeacon?.("/api/px", new Blob([body], { type: "application/json" }))) {
    fetch("/api/px", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
  }
}

export function MetaPixel({ pixelId }: { pixelId: string }) {
  const [consent, setConsent] = useState<"1" | "0" | null | "loading">("loading");
  const path = usePathname();

  useEffect(() => setConsent(readConsent()), []);

  // Liga o Pixel e manda PageView a cada página
  useEffect(() => {
    if (consent !== "1") return;
    loadPixel(pixelId);
    track("PageView");
  }, [consent, path, pixelId]);

  // ViewContent quando a seção de preços aparece na tela (uma vez por página)
  useEffect(() => {
    if (consent !== "1") return;
    const el = document.getElementById("precos") ?? document.getElementById("preco");
    if (!el || !("IntersectionObserver" in window)) return;
    const io = new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        track("ViewContent", { content_name: "Pacotes de disparo" });
        io.disconnect();
      }
    }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, [consent, path]);

  // Cliques: data-px="AddToCart" (pacote/produto) e qualquer link do WhatsApp (Contact)
  useEffect(() => {
    if (consent !== "1") return;
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest<HTMLElement>("a, button");
      if (!el) return;
      const px = el.dataset.px;
      const name = el.dataset.pxName;
      if (px === "AddToCart") track("AddToCart", name ? { content_name: name } : undefined);
      const href = el instanceof HTMLAnchorElement ? el.href : "";
      if (/wa\.me|api\.whatsapp\.com|whatsapp:\/\//i.test(href)) track("Contact", name ? { content_name: name } : undefined);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [consent]);

  if (consent !== null) return null;
  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto flex max-w-xl flex-wrap items-center gap-3 rounded-2xl bg-[#1C1C1E] px-4 py-3 text-sm text-zinc-200 shadow-2xl ring-1 ring-white/10">
      <p className="min-w-[12rem] flex-1">
        Usamos cookies para medir nossos anúncios. <a href="/privacidade" className="underline">Privacidade</a>
      </p>
      <button type="button" onClick={() => { saveConsent("0"); setConsent("0"); }} className="rounded-xl px-3 py-2 text-zinc-400 hover:text-white">Recusar</button>
      <button type="button" onClick={() => { saveConsent("1"); setConsent("1"); }} className="rounded-xl bg-white px-4 py-2 font-semibold text-zinc-900 hover:bg-zinc-100">Aceitar</button>
    </div>
  );
}
