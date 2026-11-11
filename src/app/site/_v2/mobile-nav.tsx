"use client";

// Menu do celular: abre por cima da página com as páginas do topo e fecha ao trocar de página.
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";

export function MobileNav({ items, wa }: { items: Array<{ href: string; label: string }>; wa: string }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);
  return (
    <>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-label={open ? "Fechar menu" : "Abrir menu"} className="grid size-9 place-items-center rounded-full border border-white/15 text-white md:hidden">
        {open ? <X className="size-4" /> : <Menu className="size-4" />}
      </button>
      {open && (
        <div className="fixed inset-x-3 top-[4.6rem] z-50 rounded-3xl border border-white/10 bg-[#0d0e12] p-3 shadow-2xl backdrop-blur-xl md:hidden">
          <nav className="flex flex-col" aria-label="Menu">
            {items.map((n) => (
              <Link key={n.href} href={n.href} className={`rounded-2xl px-4 py-3.5 text-lg font-medium ${path === n.href || path === `/site${n.href}` ? "bg-white/[0.06] text-white" : "text-white/80"}`}>
                {n.label}
              </Link>
            ))}
          </nav>
          <a href={wa} target="_blank" rel="noreferrer" className="btn-fire mt-3 w-full">Fale com nossa equipe no WhatsApp</a>
        </div>
      )}
    </>
  );
}
