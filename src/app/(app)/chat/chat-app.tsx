"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import {
  Archive,
  ArrowLeft,
  MessagesSquare,
  CheckCircle2,
  Clock,
  Copy,
  Hand,
  Inbox,
  Loader2,
  Megaphone,
  MessageSquarePlus,
  MousePointerClick,
  PanelRightClose,
  PanelRightOpen,
  RotateCcw,
  Search,
  Smartphone,
  UserX,
  X,
  Zap,
} from "lucide-react";
import { markConversationReadAction, setConversationStatusAction, startConversationAction } from "@/app/actions/chat";
import { formatPhone } from "@/lib/phone";
import { MessageList, type ChatMsg } from "./bubble";
import { Composer, TemplatePicker, templateForm, type ChatTemplateLite, type QuickReply } from "./composer";

export type ChatPhone = { id: string; display: string; name: string; bmId: string; bm: string; wabaId: string; quality: string };
export type ChatTemplate = ChatTemplateLite;
type Group = { id: string; name: string; bmIds: string[] };
type ConvRow = {
  id: string;
  contactPhone: string;
  contactName: string | null;
  status: "OPEN" | "ATTENDING" | "CLOSED";
  unread: number;
  hasInbound: boolean;
  lastMessageAt: string;
  lastMessageText: string | null;
  lastDirection: string | null;
  lastInboundAt: string | null;
  phoneId: string;
  clickedAt: string | null;
};
type ConvDetail = {
  id: string;
  contactPhone: string;
  contactName: string | null;
  status: ConvRow["status"];
  windowOpen: boolean;
  windowEndsAt: string | null;
  phone: { id: string; display: string; name: string | null; bm: string; wabaId: string };
};
type Extra = {
  optedOut: boolean;
  history: Array<{ campaignId: string; campaignName: string; sentAt: string; status: string; clickCount: number; repliedAt: string | null; autoReplySentAt: string | null }>;
};

const TABS = [
  { key: "sending", label: "Disparando", hint: "Quem recebeu o disparo e ainda não respondeu nem clicou" },
  { key: "active", label: "Em andamento", hint: "Quem respondeu ou clicou no botão do disparo" },
] as const;

const QUALITY_DOT: Record<string, string> = { GREEN: "bg-emerald-500", YELLOW: "bg-amber-400", RED: "bg-rose-500", UNKNOWN: "bg-zinc-400" };
const AVATAR_COLORS = ["from-orange-400 to-rose-500", "from-violet-400 to-fuchsia-500", "from-sky-400 to-indigo-500", "from-emerald-400 to-teal-500", "from-amber-400 to-orange-500", "from-pink-400 to-rose-500"];

const initials = (name: string | null, phone: string) =>
  (name?.trim() ? name.trim().split(/\s+/).slice(0, 2).map((w) => [...w][0]).join("") : phone.slice(-2)).toUpperCase();
const avatarColor = (s: string) => AVATAR_COLORS[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
const fmtPhone = (p: string) => formatPhone(p.replace(/\D/g, ""));

function shortTime(iso: string) {
  const d = new Date(iso);
  const tz = { timeZone: "America/Sao_Paulo" } as const;
  const same = d.toLocaleDateString("pt-BR", tz) === new Date().toLocaleDateString("pt-BR", tz);
  return same ? d.toLocaleTimeString("pt-BR", { ...tz, hour: "2-digit", minute: "2-digit" }) : d.toLocaleDateString("pt-BR", { ...tz, day: "2-digit", month: "2-digit" });
}

function windowLeft(endsAt: string | null) {
  if (!endsAt) return null;
  const ms = new Date(endsAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const h = Math.floor(ms / 3600_000);
  const m = Math.floor((ms % 3600_000) / 60_000);
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m}min`;
}

async function getJson<T>(url: string): Promise<T | null> {
  try {
    const r = await fetch(url, { cache: "no-store" });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

export function ChatApp({
  me,
  phones,
  groups,
  templates,
  quickReplies,
  campaignNames,
}: {
  me: { id: string; name: string };
  phones: ChatPhone[];
  groups: Group[];
  templates: ChatTemplate[];
  quickReplies: QuickReply[];
  campaignNames: Record<string, string>;
}) {
  const router = useRouter();
  const [group, setGroup] = useState("");
  const [phone, setPhone] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]["key"]>("active");
  const [showClosed, setShowClosed] = useState(false);
  const [q, setQ] = useState("");
  const [convs, setConvs] = useState<ConvRow[] | null>(null);
  const [unreadByPhone, setUnreadByPhone] = useState<Record<string, number>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ConvDetail | null>(null);
  const [extra, setExtra] = useState<Extra | null>(null);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [loadingConv, setLoadingConv] = useState(false);
  // Painel do contato: aberto por padrão só em telas largas
  const [showInfo, setShowInfo] = useState(false);
  useEffect(() => setShowInfo(window.innerWidth >= 1680), []);
  const [newConv, setNewConv] = useState(false);
  const [, start] = useTransition();
  const [, tick] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickBottom = useRef(true);

  const phoneById = useMemo(() => new Map(phones.map((p) => [p.id, p])), [phones]);
  const visiblePhones = useMemo(() => {
    const g = groups.find((x) => x.id === group);
    return g ? phones.filter((p) => g.bmIds.includes(p.bmId)) : phones;
  }, [group, groups, phones]);

  // Lista de conversas (atualiza a cada 4s)
  const loadList = useCallback(async () => {
    const sp = new URLSearchParams({ tab });
    if (showClosed) sp.set("closed", "1");
    if (phone) sp.set("phone", phone);
    else if (group) sp.set("group", group);
    if (q.trim()) sp.set("q", q.trim());
    const data = await getJson<{ conversations: ConvRow[]; unreadByPhone: Record<string, number> }>(`/api/chat/conversations?${sp}`);
    if (data) {
      setConvs(data.conversations);
      setUnreadByPhone(data.unreadByPhone);
    }
  }, [tab, phone, group, q, showClosed]);

  useEffect(() => {
    setConvs(null);
    const t = setTimeout(loadList, q ? 300 : 0);
    const i = setInterval(loadList, 4000);
    return () => { clearTimeout(t); clearInterval(i); };
  }, [loadList, q]);

  // Conversa aberta: carrega tudo e depois só as novas a cada 3s
  const openConversation = useCallback(async (id: string) => {
    setActiveId(id);
    setLoadingConv(true);
    stickBottom.current = true;
    const data = await getJson<{ conversation: ConvDetail; messages: ChatMsg[]; extra: Extra }>(`/api/chat/conversations/${id}`);
    setLoadingConv(false);
    if (!data) return;
    setDetail(data.conversation);
    setMessages(data.messages);
    setExtra(data.extra);
    setConvs((cs) => cs?.map((c) => (c.id === id ? { ...c, unread: 0 } : c)) ?? cs);
    void markConversationReadAction(id);
  }, []);

  const refreshActive = useCallback(async () => {
    if (!activeId) return;
    const last = messages[messages.length - 1]?.createdAt;
    const data = await getJson<{ conversation: ConvDetail; messages: ChatMsg[]; statuses: Array<{ id: string; status: string | null; error: string | null }> }>(
      `/api/chat/conversations/${activeId}${last ? `?after=${encodeURIComponent(last)}` : ""}`,
    );
    if (!data) return;
    setDetail(data.conversation);
    const st = new Map(data.statuses.map((s) => [s.id, s]));
    setMessages((cur) => {
      const merged = cur.map((m) => (st.has(m.id) ? { ...m, status: st.get(m.id)!.status, error: st.get(m.id)!.error } : m));
      const ids = new Set(merged.map((m) => m.id));
      const fresh = data.messages.filter((m) => !ids.has(m.id));
      if (fresh.some((m) => m.direction === "IN")) void markConversationReadAction(activeId);
      return fresh.length ? [...merged, ...fresh] : merged;
    });
  }, [activeId, messages]);

  useEffect(() => {
    if (!activeId) return;
    const i = setInterval(refreshActive, 3000);
    return () => clearInterval(i);
  }, [activeId, refreshActive]);

  // Relógio da janela de 24h
  useEffect(() => {
    const i = setInterval(() => tick((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  // Rolagem: desce sozinho quando chega mensagem nova (se o usuário já estava embaixo)
  useEffect(() => {
    const el = scrollRef.current;
    if (el && stickBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const setStatus = (status: ConvRow["status"]) => {
    if (!detail) return;
    start(async () => {
      await setConversationStatusAction(detail.id, status);
      setDetail({ ...detail, status });
      void loadList();
    });
  };

  const active = convs?.find((c) => c.id === activeId);
  const left = windowLeft(detail?.windowEndsAt ?? null);
  const convTemplates = detail ? templates.filter((t) => t.wabaId === detail.phone.wabaId) : [];
  const totalUnread = Object.values(unreadByPhone).reduce((a, b) => a + b, 0);

  return (
    <div className="-mx-10 -my-9 flex h-[100dvh] overflow-hidden bg-[#f4f4f7]">
      {/* Caixas: grupos e números */}
      <aside className="flex w-56 shrink-0 flex-col border-r border-zinc-200 bg-white max-md:hidden">
        <div className="border-b border-zinc-100 p-4">
          <div className="mb-3 flex items-center gap-2 text-lg font-semibold"><Inbox className="size-5 text-brand-500" /> Chat</div>
          <select
            value={group}
            onChange={(e) => { setGroup(e.target.value); setPhone(""); }}
            className="w-full rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">Todos os grupos</option>
            {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
        </div>
        <div className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto p-2">
          <button
            onClick={() => setPhone("")}
            className={clsx("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-sm transition", !phone ? "bg-ink text-white" : "text-zinc-600 hover:bg-zinc-100")}
          >
            <Inbox className="size-4 shrink-0" />
            <span className="flex-1 font-medium">Todos os números</span>
            {totalUnread > 0 && <span className="rounded-full bg-brand-gradient px-1.5 text-[11px] font-semibold text-white">{totalUnread}</span>}
          </button>
          {visiblePhones.map((p, i) => {
            const newBm = i === 0 || visiblePhones[i - 1].bmId !== p.bmId;
            return (
              <div key={p.id}>
                {newBm && <div className="truncate px-3 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-zinc-400">{p.bm}</div>}
                <button
                  onClick={() => setPhone(p.id)}
                  className={clsx("flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left transition", phone === p.id ? "bg-ink text-white" : "text-zinc-700 hover:bg-zinc-100")}
                >
                  <span className={clsx("size-2 shrink-0 rounded-full", QUALITY_DOT[p.quality] ?? QUALITY_DOT.UNKNOWN)} title={`Qualidade ${p.quality}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{p.display}</span>
                    {p.name && <span className={clsx("block truncate text-[11px]", phone === p.id ? "text-zinc-400" : "text-zinc-400")}>{p.name}</span>}
                  </span>
                  {(unreadByPhone[p.id] ?? 0) > 0 && <span className="rounded-full bg-brand-gradient px-1.5 text-[11px] font-semibold text-white">{unreadByPhone[p.id]}</span>}
                </button>
              </div>
            );
          })}
          {phones.length === 0 && <p className="px-3 py-4 text-sm text-zinc-400">Conecte uma BM em Conexões para começar.</p>}
        </div>
      </aside>

      {/* Lista de conversas */}
      <section className={clsx("flex w-80 shrink-0 flex-col border-r border-zinc-200 bg-white", activeId && "max-lg:hidden")}>
        <div className="space-y-3 border-b border-zinc-100 p-4">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome ou telefone" className="w-full rounded-xl border border-zinc-200 bg-zinc-50 py-2 pl-9 pr-3 text-sm outline-none focus:border-brand-400 focus:bg-white" />
            </div>
            <button onClick={() => setNewConv(true)} className="flex size-9 items-center justify-center rounded-xl bg-brand-gradient text-white shadow-sm" title="Nova conversa" aria-label="Nova conversa">
              <MessageSquarePlus className="size-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className="grid flex-1 grid-cols-2 rounded-xl bg-zinc-100 p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  title={t.hint}
                  onClick={() => { setTab(t.key); setShowClosed(false); }}
                  className={clsx("rounded-lg py-1.5 text-xs font-semibold transition", tab === t.key && !showClosed ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}
                >
                  {t.key === "sending" ? <Megaphone className="mr-1 inline size-3.5 text-orange-500" /> : <MessagesSquare className="mr-1 inline size-3.5 text-emerald-600" />}
                  {t.label}
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowClosed(!showClosed)}
              title={showClosed ? "Voltar para as abertas" : "Ver finalizadas"}
              className={clsx("flex size-9 shrink-0 items-center justify-center rounded-xl transition", showClosed ? "bg-ink text-white" : "bg-zinc-100 text-zinc-500 hover:text-zinc-800")}
              aria-label="Finalizadas"
            >
              <Archive className="size-4" />
            </button>
          </div>
          {showClosed && <div className="text-xs text-zinc-500">Mostrando as finalizadas · <button onClick={() => setShowClosed(false)} className="font-medium text-brand-600 hover:underline">voltar</button></div>}
        </div>
        <div className="scrollbar-thin flex-1 overflow-y-auto">
          {convs === null && <div className="flex justify-center p-8"><Loader2 className="size-5 animate-spin text-zinc-300" /></div>}
          {convs?.length === 0 && (
            <div className="px-6 py-14 text-center text-sm text-zinc-400">
              <Inbox className="mx-auto mb-3 size-8 text-zinc-300" />
              {showClosed ? "Nenhuma conversa finalizada." : tab === "active" ? "Ninguém respondeu nem clicou ainda. Quando um cliente responder ou clicar no botão do disparo, a conversa aparece aqui na hora." : "Nenhum disparo aguardando resposta."}
            </div>
          )}
          {convs?.map((c) => {
            const p = phoneById.get(c.phoneId);
            return (
              <button
                key={c.id}
                onClick={() => openConversation(c.id)}
                className={clsx("flex w-full items-start gap-3 border-b border-zinc-100 px-4 py-3 text-left transition", c.id === activeId ? "bg-brand-50/70" : "hover:bg-zinc-50")}
              >
                <span className={clsx("flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white", avatarColor(c.contactPhone))}>
                  {initials(c.contactName, c.contactPhone)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className={clsx("flex-1 truncate text-sm", c.unread ? "font-semibold text-zinc-900" : "font-medium text-zinc-800")}>{c.contactName || fmtPhone(c.contactPhone)}</span>
                    <span className={clsx("shrink-0 text-[11px]", c.unread ? "font-semibold text-brand-600" : "text-zinc-400")}>{shortTime(c.lastMessageAt)}</span>
                  </span>
                  <span className="mt-0.5 flex items-center gap-2">
                    <span className={clsx("flex-1 truncate text-[13px]", c.unread ? "text-zinc-700" : "text-zinc-500")}>
                      {c.lastDirection === "OUT" && <span className="text-zinc-400">Você: </span>}
                      {c.lastMessageText}
                    </span>
                    {c.unread > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-gradient px-1.5 text-[11px] font-semibold text-white">{c.unread}</span>}
                  </span>
                  <span className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-400">
                    {!phone && p && <span className="truncate">{p.display}</span>}
                    {c.status === "ATTENDING" && <span className="rounded bg-sky-50 px-1.5 text-sky-700">em atendimento</span>}
                    {c.status === "CLOSED" && <span className="rounded bg-zinc-100 px-1.5 text-zinc-500">finalizada</span>}
                    {c.clickedAt && <span className="flex items-center gap-0.5 rounded bg-sky-50 px-1.5 text-sky-700"><MousePointerClick className="size-3" /> clicou</span>}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Conversa */}
      <main className={clsx("flex min-w-0 flex-1 flex-col", !activeId && "max-lg:hidden")}>
        {!activeId ? (
          <EmptyState />
        ) : !detail || loadingConv ? (
          <div className="flex flex-1 items-center justify-center"><Loader2 className="size-6 animate-spin text-zinc-300" /></div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-zinc-200 bg-white px-5 py-3">
              <button onClick={() => setActiveId(null)} className="rounded-lg p-1 text-zinc-500 hover:bg-zinc-100 lg:hidden" aria-label="Voltar"><ArrowLeft className="size-5" /></button>
              <span className={clsx("flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br text-sm font-semibold text-white", avatarColor(detail.contactPhone))}>
                {initials(detail.contactName, detail.contactPhone)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold text-zinc-900">{detail.contactName || fmtPhone(detail.contactPhone)}</div>
                <div className="flex min-w-0 items-center gap-1.5 text-xs text-zinc-500">
                  <Smartphone className="size-3.5 shrink-0" /> <span className="truncate">via {fmtPhone(detail.phone.display)} · {detail.phone.bm}</span>
                </div>
              </div>
              <span
                className={clsx("flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium", left ? "bg-emerald-50 text-emerald-700" : "bg-zinc-100 text-zinc-500")}
                title={left ? `Janela de 24h aberta: dá para mandar mensagem livre por mais ${left}.` : "Janela de 24h fechada: só template até o cliente responder."}
              >
                <Clock className="size-3.5" /> {left ? left : "Fechada"}
              </span>
              {detail.status !== "CLOSED" ? (
                <>
                  {detail.status === "OPEN" && (
                    <button onClick={() => setStatus("ATTENDING")} className="flex shrink-0 items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50">
                      <Hand className="size-4 text-sky-600" /> Assumir
                    </button>
                  )}
                  <button onClick={() => setStatus("CLOSED")} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-ink px-3 py-1.5 text-sm font-medium text-white hover:bg-zinc-800">
                    <CheckCircle2 className="size-4" /> Finalizar
                  </button>
                </>
              ) : (
                <button onClick={() => setStatus("OPEN")} className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium hover:bg-zinc-50">
                  <RotateCcw className="size-4" /> Reabrir
                </button>
              )}
              <button onClick={() => setShowInfo(!showInfo)} className="hidden shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 lg:block" aria-label="Painel do contato">
                {showInfo ? <PanelRightClose className="size-5" /> : <PanelRightOpen className="size-5" />}
              </button>
            </header>

            <div
              ref={scrollRef}
              onScroll={(e) => {
                const el = e.currentTarget;
                stickBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
              }}
              className="scrollbar-thin flex-1 overflow-y-auto bg-[radial-gradient(circle_at_1px_1px,rgb(0_0_0/0.045)_1px,transparent_0)] bg-[length:18px_18px] px-5 py-4"
            >
              {messages.length === 0 && <p className="py-10 text-center text-sm text-zinc-400">Nenhuma mensagem ainda.</p>}
              <MessageList messages={messages} campaignNames={campaignNames} />
            </div>

            {extra?.optedOut && (
              <div className="flex items-center gap-2 border-t border-rose-100 bg-rose-50 px-5 py-2 text-sm text-rose-700">
                <UserX className="size-4" /> Este contato pediu para sair (SAIR). Ele não recebe mais disparos desta conta.
              </div>
            )}
            <Composer
              key={detail.id}
              conversationId={detail.id}
              windowOpen={detail.windowOpen}
              templates={convTemplates}
              quickReplies={quickReplies}
              onSent={() => { stickBottom.current = true; void refreshActive(); void loadList(); }}
              onQuickRepliesChanged={() => router.refresh()}
            />
          </>
        )}
      </main>

      {/* Painel do contato */}
      {detail && activeId && showInfo && !loadingConv && (
        <aside className="scrollbar-thin hidden w-72 shrink-0 overflow-y-auto border-l border-zinc-200 bg-white p-5 pb-20 lg:block">
          <div className="text-center">
            <span className={clsx("mx-auto flex size-16 items-center justify-center rounded-full bg-gradient-to-br text-xl font-semibold text-white", avatarColor(detail.contactPhone))}>
              {initials(detail.contactName, detail.contactPhone)}
            </span>
            <div className="mt-3 font-semibold text-zinc-900">{detail.contactName || "Sem nome"}</div>
            <button
              onClick={() => navigator.clipboard.writeText(detail.contactPhone)}
              className="mt-1 inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-brand-600"
              title="Copiar telefone"
            >
              {fmtPhone(detail.contactPhone)} <Copy className="size-3.5" />
            </button>
          </div>

          <div className="mt-6 rounded-2xl bg-zinc-50 p-3.5 text-sm ring-1 ring-zinc-200/70">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Falando pelo número</div>
            <div className="font-medium text-zinc-800">{fmtPhone(detail.phone.display)}</div>
            <div className="text-xs text-zinc-500">{detail.phone.name ? `${detail.phone.name} · ` : ""}{detail.phone.bm}</div>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Disparos que recebeu</div>
            {extra?.history.length ? (
              <div className="space-y-2">
                {extra.history.map((h) => (
                  <div key={h.campaignId + h.sentAt} className="rounded-xl p-3 ring-1 ring-zinc-200/70">
                    <div className="flex items-start gap-2">
                      <Megaphone className="mt-0.5 size-4 shrink-0 text-orange-500" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-zinc-800">{h.campaignName}</div>
                        <div className="text-xs text-zinc-400">{new Date(h.sentAt).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1 text-[11px]">
                      <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-zinc-600">{({ SENT: "Enviada", DELIVERED: "Entregue", READ: "Lida", FAILED: "Falhou" } as Record<string, string>)[h.status] ?? h.status}</span>
                      {h.clickCount > 0 && <span className="flex items-center gap-1 rounded bg-sky-50 px-1.5 py-0.5 text-sky-700"><MousePointerClick className="size-3" /> clicou</span>}
                      {h.repliedAt && <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-emerald-700">respondeu</span>}
                      {h.autoReplySentAt && <span className="flex items-center gap-1 rounded bg-violet-50 px-1.5 py-0.5 text-violet-700"><Zap className="size-3" /> resp. automática</span>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Nenhum disparo para este contato.</p>
            )}
          </div>
        </aside>
      )}

      {newConv && (
        <NewConversation
          phones={phones}
          templates={templates}
          defaultPhone={phone}
          onClose={() => setNewConv(false)}
          onCreated={(id) => { setNewConv(false); setTab("active"); void loadList(); void openConversation(id); }}
        />
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center p-10 text-center">
      <div className="relative mb-6">
        <div className="absolute -inset-6 rounded-full bg-brand-gradient opacity-10 blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-3xl bg-ink shadow-lift">
          <Inbox className="size-9 text-brand-400" />
        </div>
      </div>
      <div className="text-xl font-semibold text-zinc-900">Escolha uma conversa</div>
      <p className="mt-2 max-w-sm text-sm text-zinc-500">As respostas dos seus disparos chegam aqui em tempo real. Você responde pelo mesmo número que enviou.</p>
      <div className="mt-8 grid max-w-lg gap-3 text-left sm:grid-cols-3">
        {[
          { icon: Megaphone, t: "Disparos", d: "Veja o que cada contato recebeu" },
          { icon: Zap, t: "Resposta automática", d: "Configure em cada campanha" },
          { icon: Clock, t: "Janela de 24h", d: "Mensagem livre até 24h após o cliente falar" },
        ].map((x) => (
          <div key={x.t} className="rounded-2xl bg-white p-3.5 shadow-soft ring-1 ring-zinc-200/70">
            <x.icon className="mb-2 size-4 text-brand-500" />
            <div className="text-sm font-medium text-zinc-800">{x.t}</div>
            <div className="text-xs text-zinc-500">{x.d}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function NewConversation({
  phones,
  templates,
  defaultPhone,
  onClose,
  onCreated,
}: {
  phones: ChatPhone[];
  templates: ChatTemplate[];
  defaultPhone: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [phoneId, setPhoneId] = useState(defaultPhone || phones[0]?.id || "");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const p = phones.find((x) => x.id === phoneId);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 p-4" onMouseDown={onClose}>
      <div className="animate-fade-up w-full max-w-md rounded-2xl bg-white p-6 shadow-lift" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-1 flex items-center justify-between">
          <div className="text-lg font-semibold">Nova conversa</div>
          <button onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar"><X className="size-4" /></button>
        </div>
        <p className="mb-4 text-sm text-zinc-500">A primeira mensagem precisa ser um template aprovado (regra da Meta). Depois que o cliente responder, a conversa fica livre por 24h.</p>
        <div className="space-y-3">
          <select value={phoneId} onChange={(e) => setPhoneId(e.target.value)} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-400">
            {phones.map((x) => <option key={x.id} value={x.id}>{x.display} · {x.bm}</option>)}
          </select>
          <input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="Telefone do cliente (com DDD)" className="w-full rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-100" />
          <TemplatePicker
            key={phoneId}
            templates={templates.filter((t) => t.wabaId === p?.wabaId)}
            pending={pending}
            submitLabel="Enviar e abrir conversa"
            onSend={(choice) => start(async () => {
              const r = await startConversationAction(templateForm(choice, { phoneId, contact }));
              if (r.error || !r.conversationId) setError(r.error ?? "Não foi possível enviar");
              else onCreated(r.conversationId);
            })}
          />
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
