"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, Coins, FileText, Home, Layers, LogOut, Megaphone, Settings, Shield, Sparkles } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "./brand";

const sections = [
  {
    title: "Operação",
    items: [
      { href: "/", label: "Início", icon: Home },
      { href: "/campanhas", label: "Campanhas", icon: Megaphone },
      { href: "/alertas", label: "Alertas", icon: Bell },
    ],
  },
  {
    title: "WhatsApp",
    items: [
      { href: "/conexoes", label: "Conexões (BMs)", icon: Building2 },
      { href: "/grupos", label: "Grupos de BM", icon: Layers },
      { href: "/templates", label: "Templates", icon: FileText },
      { href: "/templates-padrao", label: "Templates padrão", icon: Sparkles },
    ],
  },
  {
    title: "Conta",
    items: [
      { href: "/saldo", label: "Saldo", icon: Coins },
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function Sidebar({ workspace, user, unread, balance, isSuperAdmin }: { workspace: string; user: string; unread: number; balance: number; isSuperAdmin: boolean }) {
  const path = usePathname();
  const all = isSuperAdmin ? [...sections, { title: "Plataforma", items: [{ href: "/admin", label: "Admin", icon: Shield }] }] : sections;
  return (
    <aside className="sticky top-0 flex h-screen w-64 shrink-0 flex-col bg-ink px-3 py-5 text-zinc-300">
      <Link href="/" className="mb-5 block px-3">
        <Logo className="w-full" />
      </Link>

      <Link href="/saldo" className="mx-1 mb-5 flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10 transition hover:bg-white/10">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Saldo</div>
          <div className="text-sm font-semibold text-white tabular-nums">{balance.toLocaleString("pt-BR")} <span className="font-normal text-zinc-400">créditos</span></div>
        </div>
        <Coins className="size-5 text-brand-400" />
      </Link>

      <nav className="flex-1 space-y-5 overflow-y-auto">
        {all.map((section) => (
          <div key={section.title}>
            <div className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">{section.title}</div>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? path === "/" : path.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      active ? "bg-white/10 font-medium text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand-gradient" />}
                    <Icon className={clsx("size-4", active ? "text-brand-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                    <span className="flex-1">{label}</span>
                    {href === "/alertas" && unread > 0 && (
                      <span className="rounded-full bg-brand-gradient px-1.5 text-[11px] font-semibold text-white">{unread}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-4 border-t border-white/10 pt-4">
        <div className="mb-2 px-3">
          <div className="truncate text-sm font-medium text-zinc-200">{workspace}</div>
          <div className="truncate text-xs text-zinc-500">{user}</div>
        </div>
        <form action={logoutAction}>
          <button className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100">
            <LogOut className="size-4" /> Sair
          </button>
        </form>
        <div className="mt-2 px-3 text-[10px] text-zinc-600">versão {process.env.NEXT_PUBLIC_VERSION}</div>
      </div>
    </aside>
  );
}
