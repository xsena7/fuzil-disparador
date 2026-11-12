"use client";

// Conta os cliques no WhatsApp do site (contador do Fuzil, em Admin → Cliques no WhatsApp do site).
// Anônimo e sem cookie: guarda só página, botão e de onde a pessoa veio (anúncio, Instagram, Google, direto).
import { useEffect } from "react";

const KEY = "fz_src";

function detectSource(): string {
  const q = new URLSearchParams(location.search);
  const camp = q.get("utm_campaign");
  const src = q.get("utm_source");
  if (camp || src) return [src || "Anúncio", camp].filter(Boolean).join(" · ");
  if (q.get("fbclid")) return "Meta Ads";
  if (q.get("gclid")) return "Google Ads";
  const ref = document.referrer ? new URL(document.referrer).hostname : "";
  if (!ref || ref === location.hostname) return "";
  if (/instagram/.test(ref)) return "Instagram";
  if (/facebook|fb\.com/.test(ref)) return "Facebook";
  if (/google/.test(ref)) return "Google";
  return ref.replace(/^www\./, "");
}

export function WaClickTracker() {
  useEffect(() => {
    // A origem fica a da primeira página da visita
    try {
      const s = detectSource();
      if (s || !sessionStorage.getItem(KEY)) sessionStorage.setItem(KEY, s || "Direto");
    } catch {}
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || !/wa\.me|api\.whatsapp\.com/i.test(a.href)) return;
      let source = "Direto";
      try { source = sessionStorage.getItem(KEY) || "Direto"; } catch {}
      const button = (a.dataset.pxName || a.textContent || "WhatsApp").replace(/\s+/g, " ").trim().slice(0, 60);
      const body = JSON.stringify({ page: location.pathname, button, source });
      if (!navigator.sendBeacon?.("/api/site-click", new Blob([body], { type: "application/json" }))) {
        fetch("/api/site-click", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => undefined);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
