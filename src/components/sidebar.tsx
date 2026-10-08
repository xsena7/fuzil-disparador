"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Building2, Coins, FileText, Home, Layers, LogOut, Megaphone, Settings, Shield, Sparkles } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";

const items = [
  { href: "/", label: "Início", icon: Home },
  { href: "/conexoes", label: "Conexões (BMs)", icon: Building2 },
  { href: "/grupos", label: "Grupos de BM", icon: Layers },
  { href: "/templates", label: "Templates", icon: FileText },
  { href: "/templates-padrao", label: "Templates padrão", icon: Sparkles },
  { href: "/campanhas", label: "Campanhas", icon: Megaphone },
  { href: "/alertas", label: "Alertas", icon: Bell },
  { href: "/saldo", label: "Saldo", icon: Coins },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function Sidebar({ workspace, user, unread, balance, isSuperAdmin }: { workspace: string; user: string; unread: number; balance: number; isSuperAdmin: boolean }) {
  const path = usePathname();
  const all = isSuperAdmin ? [...items, { href: "/admin", label: "Admin", icon: Shield }] : items;
  return (
    <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50 p-3">
      <div className="mb-4 flex items-center gap-2 px-2 py-1">
        <div className="flex size-8 items-center justify-center rounded-lg bg-brand-500 font-black text-white">F</div>
        <div className="min-w-0">
          <div className="truncate text-xs font-bold tracking-tight">FUZIL DISPARADOR</div>
          <div className="truncate text-xs text-zinc-500">{workspace}</div>
        </div>
      </div>
      <Link href="/saldo" className="mb-4 flex items-center justify-between rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs">
        <span className="text-zinc-500">Saldo</span>
        <span className="font-semibold">{balance.toLocaleString("pt-BR")} créditos</span>
      </Link>
      <nav className="flex-1 space-y-0.5">
        {all.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <Link key={href} href={href} className={clsx("flex items-center gap-2.5 rounded-lg px-2.5 py-2", active ? "bg-white font-medium shadow-sm ring-1 ring-zinc-200" : "text-zinc-600 hover:bg-zinc-100")}>
              <Icon className="size-4" />
              <span className="flex-1">{label}</span>
              {href === "/alertas" && unread > 0 && <span className="rounded-full bg-red-500 px-1.5 text-xs font-semibold text-white">{unread}</span>}
            </Link>
          );
        })}
      </nav>
      <form action={logoutAction} className="border-t border-zinc-200 pt-3">
        <div className="mb-2 truncate px-2.5 text-xs text-zinc-500">{user}</div>
        <button className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-zinc-600 hover:bg-zinc-100"><LogOut className="size-4" /> Sair</button>
      </form>
    </aside>
  );
}
