"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Bell, Building2, GraduationCap, MessagesSquare, Coins, FileText, Flame, Home, Layers, LogOut, Megaphone, Menu, X, Settings, Shield, ShoppingBag, Sparkles, Wallet } from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { Logo } from "./brand";
import { APP_VERSION } from "@/version";

const sections = [
  {
    title: "Operação",
    items: [
      { href: "/", label: "Início", icon: Home },
      { href: "/campanhas", label: "Campanhas", icon: Megaphone },
      { href: "/aquecimento", label: "Aquecimento", icon: Flame },
      { href: "/chat", label: "Chat", icon: MessagesSquare },
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
  {
    title: "Ajuda",
    items: [{ href: "/tutoriais", label: "Tutoriais", icon: GraduationCap }],
  },
];

export function Sidebar({ workspace, user, unread, chatUnread = 0, balance, isSuperAdmin, financePartner = false }: { workspace: string; user: string; unread: number; chatUnread?: number; balance: number; isSuperAdmin: boolean; financePartner?: boolean }) {
  const path = usePathname();
  // No celular o menu fica escondido e abre pelo botão ☰; fecha sozinho ao trocar de página
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  // Financeiro: só para os sócios (fixos no banco)
  const platform = [...(isSuperAdmin ? [{ href: "/admin", label: "Admin", icon: Shield }] : []), ...(financePartner ? [{ href: "/financeiro", label: "Financeiro", icon: Wallet }, { href: "/vendas", label: "Vendas", icon: ShoppingBag }] : [])];
  const all = platform.length ? [...sections, { title: "Plataforma", items: platform }] : sections;
  return (
    <>
    <div className="fixed inset-x-0 top-0 z-40 flex h-14 items-center gap-3 bg-ink px-4 md:hidden">
      <button onClick={() => setOpen(true)} aria-label="Abrir menu" className="-ml-1 rounded-lg p-1.5 text-zinc-300 hover:bg-white/10">
        <Menu className="size-6" />
      </button>
      <Link href="/" aria-label="Início"><Logo className="h-6 w-auto" /></Link>
      {(unread > 0 || chatUnread > 0) && (
        <span className="ml-auto flex gap-1.5">
          {chatUnread > 0 && <span className="rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white">{chatUnread}</span>}
          {unread > 0 && <span className="rounded-full bg-brand-gradient px-1.5 text-[11px] font-semibold text-white">{unread}</span>}
        </span>
      )}
    </div>
    {open && <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setOpen(false)} />}
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-50 flex h-screen w-64 shrink-0 flex-col bg-ink px-3 py-5 text-zinc-300 transition-transform md:sticky md:top-0 md:translate-x-0",
        open ? "translate-x-0" : "-translate-x-full",
      )}
    >
      <div className="mb-6 flex items-center px-3 pt-1">
        <Link href="/" aria-label="Início">
          <Logo className="h-9 w-auto" />
        </Link>
        <button onClick={() => setOpen(false)} aria-label="Fechar menu" className="ml-auto rounded-lg p-1 text-zinc-400 hover:bg-white/10 md:hidden">
          <X className="size-5" />
        </button>
      </div>

      <Link href="/saldo" className="mx-1 mb-5 flex items-center justify-between rounded-xl bg-white/5 px-3.5 py-3 ring-1 ring-white/10 transition hover:bg-white/10">
        <div>
          <div className="text-[11px] uppercase tracking-wider text-zinc-500">Saldo</div>
          <div className="text-sm font-semibold text-white tabular-nums">{balance.toLocaleString("pt-BR")} <span className="font-normal text-zinc-400">créditos</span></div>
        </div>
        <Coins className="size-5 text-brand-400" />
      </Link>

      <nav className="scrollbar-dark -mr-2 flex-1 space-y-5 overflow-y-auto pr-2">
        {all.map((section) => (
          <div key={section.title}>
            <div className="mb-1.5 px-3 text-[11px] font-medium uppercase tracking-wider text-zinc-600">{section.title}</div>
            <div className="space-y-0.5">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active = href === "/" ? path === "/" : path === href || path.startsWith(`${href}/`);
                return (
                  <Link
                    key={href}
                    href={href}
                    data-tour={href === "/conexoes" ? "nav-conexoes" : undefined}
                    className={clsx(
                      "group relative flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
                      active ? "bg-white/10 font-medium text-white" : "text-zinc-400 hover:bg-white/5 hover:text-zinc-100",
                    )}
                  >
                    {active && <span className="absolute inset-y-2 left-0 w-1 rounded-full bg-brand-gradient" />}
                    <Icon className={clsx("size-4", active ? "text-brand-400" : "text-zinc-500 group-hover:text-zinc-300")} />
                    <span className="flex-1">{label}</span>
                    {href === "/chat" && chatUnread > 0 && (
                      <span className="rounded-full bg-emerald-500 px-1.5 text-[11px] font-semibold text-white">{chatUnread}</span>
                    )}
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
        <Link href="/novidades" title={`build ${process.env.NEXT_PUBLIC_VERSION}`} className="mt-2 block px-3 text-[11px] text-zinc-500 hover:text-brand-400">
          v{APP_VERSION} · novidades
        </Link>
      </div>
    </aside>
    </>
  );
}
