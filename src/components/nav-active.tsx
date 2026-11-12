"use client";

// Diz ao menu lateral qual item acender quando o endereço não basta (ex.: aquecimento abre em /campanhas/<id>).
import { useEffect } from "react";

export function NavActive({ href }: { href: string }) {
  useEffect(() => {
    (window as unknown as { __fzNav?: string | null }).__fzNav = href;
    window.dispatchEvent(new CustomEvent("fz-nav", { detail: href }));
    return () => {
      (window as unknown as { __fzNav?: string | null }).__fzNav = null;
      window.dispatchEvent(new CustomEvent("fz-nav", { detail: null }));
    };
  }, [href]);
  return null;
}
