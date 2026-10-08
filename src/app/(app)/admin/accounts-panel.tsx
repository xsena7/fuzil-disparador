"use client";

import { Fragment, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  Ban,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Coins,
  Copy,
  Eye,
  KeyRound,
  Mail,
  MoreVertical,
  Pencil,
  Search,
  Tag,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import {
  adminBlockWorkspaceAction,
  adminDeleteWorkspaceAction,
  adminEnterWorkspaceAction,
  adminLoginLinkAction,
  adminQuickCreditsAction,
  adminQuickPriceAction,
  adminRenameWorkspaceAction,
  adminResendInviteAction,
  adminUnblockWorkspaceAction,
} from "@/app/actions/misc";
import { Badge, Button, Input } from "@/components/ui";
import { UserActions } from "./user-actions";
import type { AccountRow } from "@/lib/admin-accounts";

const PAGE = 25;
const n = (v: number) => v.toLocaleString("pt-BR");
const limitText = (v: number | null) => (v === null ? "—" : v === -1 ? "Ilimitado" : n(v));
const date = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const dateTime = (iso: string) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

type Dialog =
  | { kind: "credits" | "price" | "rename" | "block" | "delete"; account: AccountRow }
  | { kind: "link"; account: AccountRow; text: string; link?: string };

export function AccountsPanel({ accounts, selfId }: { accounts: AccountRow[]; selfId: string }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "blocked">("all");
  const [page, setPage] = useState(0);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [flash, setFlash] = useState<{ text: string; error?: boolean } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return accounts.filter(
      (a) =>
        (filter === "all" || (filter === "blocked") === a.blocked) &&
        (!q || a.name.toLowerCase().includes(q) || a.users.some((u) => u.email.toLowerCase().includes(q) || u.name.toLowerCase().includes(q))),
    );
  }, [accounts, query, filter]);
  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE, current * PAGE + PAGE);
  const blockedCount = accounts.filter((a) => a.blocked).length;

  const toggle = (id: string) =>
    setOpen((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="rounded-2xl border border-zinc-200/80 bg-white shadow-soft">
      <div className="flex flex-wrap items-center gap-3 border-b border-zinc-100 p-4">
        <div className="mr-auto">
          <div className="font-semibold">Contas ({accounts.length})</div>
          <div className="text-xs text-zinc-500">Clique na linha para ver usuários e BMs. Use o ⋮ para entrar, bloquear, excluir e mais.</div>
        </div>
        <div className="flex rounded-lg bg-zinc-100 p-0.5 text-xs font-medium">
          {([["all", "Todas"], ["active", "Ativas"], ["blocked", `Bloqueadas${blockedCount ? ` (${blockedCount})` : ""}`]] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => { setFilter(k); setPage(0); }}
              className={clsx("rounded-md px-3 py-1.5", filter === k ? "bg-white shadow-sm" : "text-zinc-500 hover:text-zinc-800")}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
          <Input value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }} placeholder="Buscar conta ou e-mail" className="w-64 pl-9" />
        </div>
      </div>

      {flash && (
        <div className={clsx("flex items-center gap-2 border-b px-4 py-2.5 text-sm", flash.error ? "border-rose-100 bg-rose-50 text-rose-700" : "border-emerald-100 bg-emerald-50 text-emerald-800")}>
          <span className="flex-1">{flash.text}</span>
          <button onClick={() => setFlash(null)} aria-label="Fechar"><X className="size-4" /></button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 text-left text-xs font-medium uppercase tracking-wide text-zinc-400">
              <th className="w-8 px-4 py-3" />
              <th className="px-3 py-3">Conta</th>
              <th className="px-3 py-3">Dono</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-3 py-3 text-right">Limite geral 24h</th>
              <th className="px-3 py-3 text-right">Disparos feitos</th>
              <th className="px-3 py-3 text-right">Saldo</th>
              <th className="px-3 py-3">Criada em</th>
              <th className="w-10 px-3 py-3" />
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const expanded = open.has(a.id);
              return (
                <Fragment key={a.id}>
                  <tr onClick={() => toggle(a.id)} className={clsx("cursor-pointer border-b border-zinc-100 transition hover:bg-zinc-50/80", expanded && "bg-zinc-50/80", a.blocked && "text-zinc-500")}>
                    <td className="px-4 py-3"><ChevronDown className={clsx("size-4 text-zinc-400 transition", !expanded && "-rotate-90")} /></td>
                    <td className="px-3 py-3">
                      <div className="font-medium text-zinc-900">{a.name}{a.isMine && <span className="ml-2"><Badge color="orange" dot={false}>sua conta</Badge></span>}</div>
                      <div className="text-xs text-zinc-500">
                        {a.users.length} {a.users.length === 1 ? "usuário" : "usuários"} · {a.bms.length} {a.bms.length === 1 ? "BM" : "BMs"} · {a.campaigns} campanhas
                        {a.running > 0 && <span className="text-emerald-600"> · {a.running} rodando</span>}
                      </div>
                    </td>
                    <td className="px-3 py-3">
                      <div>{a.owner?.name ?? "—"}</div>
                      <div className="text-xs text-zinc-500">{a.owner?.email}</div>
                    </td>
                    <td className="px-3 py-3">{a.blocked ? <Badge color="red">Bloqueada</Badge> : <Badge color="green">Ativa</Badge>}</td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <div className="font-medium text-zinc-900">{limitText(a.totalLimit)}</div>
                      {a.totalLimit !== null && <div className="text-xs text-zinc-500">{n(a.used24h)} usados</div>}
                    </td>
                    <td className="px-3 py-3 text-right font-medium tabular-nums text-zinc-900">{n(a.sentTotal)}</td>
                    <td className="px-3 py-3 text-right tabular-nums">{n(a.creditBalance)}</td>
                    <td className="px-3 py-3 text-xs text-zinc-500">{date(a.createdAt)}</td>
                    <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                      <AccountMenu account={a} onDialog={setDialog} onFlash={setFlash} />
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="border-b border-zinc-100 bg-zinc-50/60">
                      <td />
                      <td colSpan={8} className="px-3 pb-5 pt-1">
                        {a.blocked && a.blockedReason && <div className="mb-3 text-xs text-rose-600">Motivo do bloqueio: {a.blockedReason}</div>}
                        <div className="grid gap-4 lg:grid-cols-[3fr_2fr]">
                          <div className="rounded-xl border border-zinc-200 bg-white">
                            <div className="border-b border-zinc-100 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-400">Usuários</div>
                            {a.users.map((u) => (
                              <div key={u.id} className="flex flex-wrap items-center gap-3 border-b border-zinc-100 px-4 py-2.5 last:border-0">
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium">
                                    {u.name} <span className="text-xs font-normal text-zinc-500">· {u.role === "OWNER" ? "dono" : u.role === "ADMIN" ? "admin" : "membro"}</span>
                                  </div>
                                  <div className="text-xs text-zinc-500">{u.email}</div>
                                </div>
                                {u.lastLoginAt ? <span className="text-xs text-zinc-500">Último acesso {dateTime(u.lastLoginAt)}</span> : <Badge color="yellow">Convite pendente</Badge>}
                                <UserActions id={u.id} email={u.email} isSelf={u.id === selfId} />
                              </div>
                            ))}
                            {a.users.length === 0 && <div className="px-4 py-3 text-xs text-zinc-400">Nenhum usuário</div>}
                          </div>
                          <div className="rounded-xl border border-zinc-200 bg-white">
                            <div className="border-b border-zinc-100 px-4 py-2.5 text-xs font-medium uppercase tracking-wide text-zinc-400">BMs · limite de 24h</div>
                            {a.bms.map((b, i) => (
                              <div key={i} className="flex items-center justify-between gap-3 border-b border-zinc-100 px-4 py-2 last:border-0">
                                <span className="truncate">{b.name}</span>
                                <span className="shrink-0 text-xs tabular-nums text-zinc-500">{n(b.used)} / {limitText(b.limit)}</span>
                              </div>
                            ))}
                            {a.bms.length === 0 && <div className="px-4 py-3 text-xs text-zinc-400">Nenhuma BM conectada</div>}
                          </div>
                        </div>
                        <p className="mt-3 text-xs text-zinc-500">Para ver campanhas, templates e métricas, use ⋮ → Entrar na conta.</p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-zinc-400">Nenhuma conta encontrada</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-end gap-3 p-3 text-xs text-zinc-500">
        <span>{filtered.length ? `${current * PAGE + 1}–${Math.min(filtered.length, (current + 1) * PAGE)} de ${filtered.length}` : "0 contas"}</span>
        <button className="rounded-lg p-1.5 hover:bg-zinc-100 disabled:opacity-30" disabled={current === 0} onClick={() => setPage(current - 1)} aria-label="Página anterior"><ChevronLeft className="size-4" /></button>
        <button className="rounded-lg p-1.5 hover:bg-zinc-100 disabled:opacity-30" disabled={current >= pages - 1} onClick={() => setPage(current + 1)} aria-label="Próxima página"><ChevronRight className="size-4" /></button>
      </div>

      {dialog && <AccountDialog dialog={dialog} onClose={() => setDialog(null)} onFlash={setFlash} />}
    </div>
  );
}

function AccountMenu({ account: a, onDialog, onFlash }: { account: AccountRow; onDialog: (d: Dialog) => void; onFlash: (f: { text: string; error?: boolean }) => void }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top?: number; bottom?: number; left: number; maxHeight: number }>({ left: 0, maxHeight: 400 });
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const owner = a.users.find((u) => u.role === "OWNER") ?? a.users[0];

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && !menuRef.current?.contains(e.target as Node) && setOpen(false);
    const hide = () => setOpen(false);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, [open]);

  // O menu flutua por cima da página (não é cortado pela tabela); abre para cima se não couber embaixo
  const toggleMenu = () => {
    if (open) return setOpen(false);
    const r = ref.current!.getBoundingClientRect();
    const left = Math.max(8, r.right - 256);
    const below = window.innerHeight - r.bottom - 12;
    const above = r.top - 12;
    setPos(below >= 340 || below >= above ? { top: r.bottom + 4, left, maxHeight: below } : { bottom: window.innerHeight - r.top + 4, left, maxHeight: above });
    setOpen(true);
  };

  const pick = (fn: () => void) => () => { setOpen(false); fn(); };
  const run = (fn: () => Promise<{ ok?: string; error?: string } | void>) =>
    pick(() => start(async () => {
      const r = await fn();
      if (r) onFlash(r.error ? { text: r.error, error: true } : { text: r.ok ?? "Feito" });
      router.refresh();
    }));

  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent";
  return (
    <div ref={ref} className="relative">
      <button onClick={toggleMenu} className={clsx("rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700", open && "bg-zinc-100 text-zinc-700", pending && "animate-pulse")} aria-label="Ações da conta">
        <MoreVertical className="size-4" />
      </button>
      {open && createPortal(
        <div ref={menuRef} style={{ position: "fixed", ...pos }} className="animate-fade-up z-50 w-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lift">
          <button className={item} disabled={a.isMine} onClick={run(() => adminEnterWorkspaceAction(a.id))}><Eye className="size-4 text-brand-500" /> Entrar na conta</button>
          <button
            className={item}
            disabled={!owner}
            onClick={pick(() => start(async () => {
              const r = await adminLoginLinkAction(a.id);
              onDialog({ kind: "link", account: a, text: r.error ?? r.ok ?? "", link: r.link });
            }))}
          >
            <KeyRound className="size-4 text-zinc-400" /> Gerar link de login
          </button>
          <button className={item} disabled={!owner} onClick={run(() => adminResendInviteAction(owner!.id))}><Mail className="size-4 text-zinc-400" /> Reenviar convite por e-mail</button>
          <div className="my-1 h-px bg-zinc-100" />
          <button className={item} onClick={pick(() => onDialog({ kind: "credits", account: a }))}><Coins className="size-4 text-zinc-400" /> Adicionar / remover créditos</button>
          <button className={item} onClick={pick(() => onDialog({ kind: "price", account: a }))}><Tag className="size-4 text-zinc-400" /> Preço por mensagem ({a.creditsPerMessage})</button>
          <button className={item} onClick={pick(() => onDialog({ kind: "rename", account: a }))}><Pencil className="size-4 text-zinc-400" /> Renomear conta</button>
          <div className="my-1 h-px bg-zinc-100" />
          {a.blocked ? (
            <button className={item} onClick={run(() => adminUnblockWorkspaceAction(a.id))}><Unlock className="size-4 text-emerald-600" /> Desbloquear conta</button>
          ) : (
            <button className={clsx(item, "text-amber-700 hover:bg-amber-50")} disabled={a.isMine} onClick={pick(() => onDialog({ kind: "block", account: a }))}><Ban className="size-4" /> Bloquear conta</button>
          )}
          <button className={clsx(item, "text-rose-600 hover:bg-rose-50")} disabled={a.isMine} title={a.isMine ? "Esta é a sua conta" : undefined} onClick={pick(() => onDialog({ kind: "delete", account: a }))}>
            <Trash2 className="size-4" /> Excluir conta
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}

function AccountDialog({ dialog, onClose, onFlash }: { dialog: Dialog; onClose: () => void; onFlash: (f: { text: string; error?: boolean }) => void }) {
  const a = dialog.account;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const router = useRouter();

  const submit = (fn: (form: FormData) => Promise<{ ok?: string; error?: string }>) => (form: FormData) =>
    start(async () => {
      const r = await fn(form);
      if (r.error) return setError(r.error);
      onFlash({ text: r.ok ?? "Feito" });
      onClose();
      router.refresh();
    });
  const str = (f: FormData, k: string) => String(f.get(k) ?? "");

  const titles: Record<Dialog["kind"], string> = {
    credits: "Adicionar ou remover créditos",
    price: "Preço por mensagem",
    rename: "Renomear conta",
    block: "Bloquear conta",
    delete: "Excluir conta",
    link: "Link de login",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4" onMouseDown={onClose}>
      <div className="animate-fade-up w-full max-w-md rounded-2xl bg-white p-6 shadow-lift" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="text-lg font-semibold">{titles[dialog.kind]}</div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar"><X className="size-4" /></button>
        </div>
        <div className="mb-5 text-sm text-zinc-500">Conta <b className="text-zinc-800">{a.name}</b></div>

        {dialog.kind === "link" && (
          <div className="space-y-3 text-sm">
            <p className="text-zinc-600">{dialog.text}</p>
            {dialog.link && (
              <>
                <Input readOnly value={dialog.link} onFocus={(e) => e.target.select()} className="font-mono text-xs" />
                <Button type="button" className="w-full" onClick={() => { navigator.clipboard.writeText(dialog.link!); setCopied(true); }}>
                  <Copy className="size-4" /> {copied ? "Copiado!" : "Copiar link"}
                </Button>
                <p className="text-xs text-zinc-500">A pessoa abre o link, cria uma senha e já entra no painel. Os links anteriores continuam valendo até expirar.</p>
              </>
            )}
          </div>
        )}

        {dialog.kind === "credits" && (
          <form action={submit((f) => adminQuickCreditsAction(a.id, Number(str(f, "amount")), str(f, "note")))} className="space-y-3">
            <p className="text-sm text-zinc-600">Saldo atual: <b>{n(a.creditBalance)}</b> créditos. Use número negativo para remover.</p>
            <Input name="amount" type="number" placeholder="+10000 ou -500" required autoFocus />
            <Input name="note" placeholder="Observação (opcional)" />
            <Footer pending={pending} error={error} onClose={onClose} label="Lançar" />
          </form>
        )}

        {dialog.kind === "price" && (
          <form action={submit((f) => adminQuickPriceAction(a.id, Number(str(f, "price"))))} className="space-y-3">
            <p className="text-sm text-zinc-600">Quantos créditos cada mensagem enviada consome.</p>
            <Input name="price" type="number" min={0} defaultValue={a.creditsPerMessage} required autoFocus />
            <Footer pending={pending} error={error} onClose={onClose} label="Salvar" />
          </form>
        )}

        {dialog.kind === "rename" && (
          <form action={submit((f) => adminRenameWorkspaceAction(a.id, str(f, "name")))} className="space-y-3">
            <Input name="name" defaultValue={a.name} required autoFocus />
            <Footer pending={pending} error={error} onClose={onClose} label="Salvar" />
          </form>
        )}

        {dialog.kind === "block" && (
          <form action={submit((f) => adminBlockWorkspaceAction(a.id, str(f, "reason")))} className="space-y-3">
            <p className="text-sm text-zinc-600">
              Os usuários dessa conta não conseguem mais entrar no painel e as campanhas rodando ou agendadas são <b>pausadas</b>. Dá pra desbloquear depois; aí o cliente retoma as campanhas.
            </p>
            <Input name="reason" placeholder="Motivo (aparece para o cliente, opcional)" autoFocus />
            <Footer pending={pending} error={error} onClose={onClose} label="Bloquear conta" danger />
          </form>
        )}

        {dialog.kind === "delete" && (
          <form action={submit((f) => adminDeleteWorkspaceAction(a.id, str(f, "confirm")))} className="space-y-3">
            <p className="text-sm text-zinc-600">
              Apaga do Fuzil <b>tudo</b> dessa conta: BMs conectadas, grupos, templates, campanhas, relatórios e saldo. Usuários que só tinham essa conta também são excluídos.
              Nada é apagado na Meta. <b>Não dá pra desfazer.</b>
            </p>
            <p className="text-sm text-zinc-600">Digite <b className="text-zinc-900">{a.name}</b> para confirmar:</p>
            <Input name="confirm" autoComplete="off" required autoFocus />
            <Footer pending={pending} error={error} onClose={onClose} label="Excluir definitivamente" danger />
          </form>
        )}
      </div>
    </div>
  );
}

function Footer({ pending, error, onClose, label, danger }: { pending: boolean; error: string | null; onClose: () => void; label: string; danger?: boolean }) {
  return (
    <>
      {error && <p className="text-sm text-rose-600">{error}</p>}
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button variant={danger ? "danger" : "primary"} disabled={pending}>{pending ? "Aguarde..." : label}</Button>
      </div>
    </>
  );
}
