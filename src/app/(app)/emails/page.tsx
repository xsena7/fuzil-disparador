import Link from "next/link";
import clsx from "clsx";
import { ArrowLeft, Inbox, Mail, Paperclip, PenSquare, Reply, Send, ShoppingBag, Trash2 } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireFinancePartner } from "@/lib/finance-partners";
import { mailDomain, type MailAttachment } from "@/lib/mail";
import { emailConfigured } from "@/lib/email";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { Badge, Card, Empty, Field, Input, PageHeader, Textarea } from "@/components/ui";
import { createMailboxAction, deleteMailboxAction, deleteMessageAction, markUnreadAction, sendMailAction, setStockMailboxAction } from "@/app/actions/mail";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const when = (d: Date) => {
  const today = new Date().toLocaleDateString("pt-BR", { timeZone: TZ }) === d.toLocaleDateString("pt-BR", { timeZone: TZ });
  return d.toLocaleString("pt-BR", { timeZone: TZ, ...(today ? { hour: "2-digit", minute: "2-digit" } : { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) });
};
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

/** HTML do e-mail num iframe isolado: sem scripts, sem acesso ao Fuzil; links abrem em outra aba. */
function safeDoc(html: string) {
  return `<!doctype html><html><head><meta charset="utf-8"><base target="_blank"><meta http-equiv="Content-Security-Policy" content="script-src 'none'; object-src 'none'; frame-src 'none'; form-action 'none'"><style>body{margin:0;padding:16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#18181b;word-wrap:break-word}img{max-width:100%;height:auto}</style></head><body>${html}</body></html>`;
}

export default async function EmailsPage({ searchParams }: { searchParams: Promise<{ caixa?: string; msg?: string; novo?: string; responder?: string; pasta?: string; q?: string }> }) {
  await requireFinancePartner();
  const sp = await searchParams;
  const domain = mailDomain();
  const boxes = await prisma.mailBox.findMany({ orderBy: { address: "asc" }, include: { _count: { select: { messages: { where: { direction: "IN", readAt: null } } } }, product: { select: { name: true } } } });
  const box = boxes.find((b) => b.id === sp.caixa) ?? boxes[0] ?? null;
  const pasta = sp.pasta === "enviados" ? "OUT" : "IN";
  const q = (sp.q ?? "").trim().slice(0, 80);

  let msg = sp.msg ? await prisma.mailMessage.findFirst({ where: { id: sp.msg, mailboxId: box?.id } }) : null;
  if (msg && !msg.readAt && msg.direction === "IN") {
    msg = await prisma.mailMessage.update({ where: { id: msg.id }, data: { readAt: new Date() } });
    // O contador da caixa foi lido antes de abrir esse e-mail
    if (box) box._count.messages = Math.max(0, box._count.messages - 1);
  }
  const replying = sp.responder ? await prisma.mailMessage.findFirst({ where: { id: sp.responder, mailboxId: box?.id } }) : null;
  const composing = Boolean(sp.novo || replying);
  const list =
    box && !msg && !composing
      ? await prisma.mailMessage.findMany({
          where: { mailboxId: box.id, direction: pasta, ...(q ? { OR: [{ subject: { contains: q, mode: "insensitive" } }, { fromAddr: { contains: q, mode: "insensitive" } }, { fromName: { contains: q, mode: "insensitive" } }, { toAddr: { contains: q, mode: "insensitive" } }] } : {}) },
          orderBy: { receivedAt: "desc" },
          take: 100,
          select: { id: true, fromAddr: true, fromName: true, toAddr: true, subject: true, text: true, readAt: true, receivedAt: true, attachments: true },
        })
      : [];
  const base = box ? `/emails?caixa=${box.id}` : "/emails";

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader title="E-mails" description={`E-mails @${domain} recebidos direto no Fuzil. Crie quantos endereços quiser.`} />
      <div className="grid gap-5 lg:grid-cols-[18rem_1fr]">
        {/* Caixas */}
        <div className="space-y-3">
          <Card className="overflow-hidden p-0">
            {boxes.length === 0 && <p className="p-4 text-sm text-zinc-500">Nenhum e-mail criado ainda.</p>}
            {boxes.map((b) => (
              <Link key={b.id} href={`/emails?caixa=${b.id}`} className={clsx("flex items-center gap-3 border-b border-zinc-100 px-4 py-3 text-sm last:border-0", box?.id === b.id ? "bg-orange-50" : "hover:bg-zinc-50")}>
                <span className={clsx("flex size-8 shrink-0 items-center justify-center rounded-lg", box?.id === b.id ? "bg-brand-gradient text-white" : "bg-zinc-100 text-zinc-500")}>
                  {b.purpose === "STOCK" || b.productId ? <ShoppingBag className="size-4" /> : <Mail className="size-4" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold text-zinc-900">{b.name}</span>
                  <span className="block truncate text-xs text-zinc-500">{b.address}</span>
                </span>
                {b._count.messages > 0 && <span className="rounded-full bg-sky-500 px-1.5 text-[11px] font-semibold text-white">{b._count.messages}</span>}
              </Link>
            ))}
          </Card>
          <Card className="p-4">
            <div className="mb-3 text-sm font-semibold">Novo e-mail</div>
            <ActionForm action={createMailboxAction} submit="Criar e-mail">
              <div className="space-y-3">
                <Field label="Endereço">
                  <div className="flex items-center rounded-xl border border-zinc-200 bg-white pr-3 focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100">
                    <input name="local" required maxLength={64} placeholder="contato" className="min-w-0 flex-1 rounded-xl px-3 py-2 text-sm outline-none" autoComplete="off" />
                    <span className="text-xs text-zinc-500">@{domain}</span>
                  </div>
                </Field>
                <Field label="Nome (aparece para quem recebe)">
                  <Input name="name" maxLength={60} placeholder="Fuzil Disparador" />
                </Field>
                <label className="flex items-start gap-2 text-xs text-zinc-600">
                  <input type="checkbox" name="stock" className="mt-0.5" /> É o e-mail do estoque das Vendas (os convites de BM que chegarem aqui entram sozinhos no estoque)
                </label>
              </div>
            </ActionForm>
          </Card>
        </div>

        {/* Conteúdo */}
        <div className="min-w-0 space-y-3">
          {!box ? (
            <Empty icon={<Inbox className="size-5" />}>Crie o primeiro e-mail ao lado. Ele já começa a receber assim que o domínio estiver apontado para o Fuzil.</Empty>
          ) : (
            <>
              <Card className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex min-w-0 flex-wrap items-center gap-2 font-semibold text-zinc-900">
                    <span className="min-w-0 truncate">{box.address}</span> {box.purpose === "STOCK" && <Badge color="green">E-mail geral do estoque das Vendas</Badge>}
                    {box.product && <Badge color="green">Estoque do produto: {box.product.name}</Badge>}
                  </div>
                  <div className="text-xs text-zinc-500">{box.name}</div>
                </div>
                <Link href={`${base}&novo=1`} className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-4 py-2 text-sm font-semibold text-white shadow-sm"><PenSquare className="size-4" /> Escrever</Link>
                <ConfirmButton action={setStockMailboxAction.bind(null, box.id)} className="px-3 py-2 text-xs">{box.purpose === "STOCK" ? "Deixar de ser o estoque" : "Usar como e-mail do estoque"}</ConfirmButton>
                <ConfirmButton action={deleteMailboxAction.bind(null, box.id)} confirm={`Apagar ${box.address}?\nTodos os e-mails dela somem e o endereço para de receber.`} variant="danger" className="px-3 py-2 text-xs"><Trash2 className="size-3.5" /></ConfirmButton>
              </Card>

              {composing ? (
                <Card className="p-5">
                  <Link href={base} className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900"><ArrowLeft className="size-4" /> Voltar</Link>
                  {!emailConfigured() && <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">Para enviar, falta a chave do Resend em Admin (o domínio {domain} precisa estar verificado nele).</p>}
                  <ActionForm action={sendMailAction} submit="Enviar">
                    <input type="hidden" name="mailboxId" value={box.id} />
                    {replying?.messageId && <input type="hidden" name="inReplyTo" value={replying.messageId} />}
                    <div className="space-y-3">
                      <div className="text-sm text-zinc-500">De: <b className="text-zinc-800">{box.name} &lt;{box.address}&gt;</b></div>
                      <Field label="Para">
                        <Input name="to" required defaultValue={replying ? replying.fromAddr : ""} placeholder="cliente@exemplo.com" />
                      </Field>
                      <Field label="Assunto">
                        <Input name="subject" defaultValue={replying ? (/^re:/i.test(replying.subject) ? replying.subject : `Re: ${replying.subject}`) : ""} maxLength={200} />
                      </Field>
                      <Field label="Mensagem">
                        <Textarea
                          name="body"
                          rows={12}
                          required
                          defaultValue={replying ? `\n\n---\nEm ${when(replying.receivedAt)}, ${replying.fromName ?? replying.fromAddr} escreveu:\n${(replying.text ?? "").split("\n").slice(0, 40).map((l) => `> ${l}`).join("\n")}` : ""}
                        />
                      </Field>
                    </div>
                  </ActionForm>
                </Card>
              ) : msg ? (
                <Card className="overflow-hidden p-0">
                  <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 px-5 py-3">
                    <Link href={`${base}${msg.direction === "OUT" ? "&pasta=enviados" : ""}`} className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-600 hover:text-zinc-900"><ArrowLeft className="size-4" /> Voltar</Link>
                    <span className="ml-auto flex flex-wrap gap-2">
                      {msg.direction === "IN" && <Link href={`${base}&responder=${msg.id}`} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"><Reply className="size-3.5" /> Responder</Link>}
                      {msg.direction === "IN" && <ConfirmButton action={markUnreadAction.bind(null, msg.id)} className="px-3 py-1.5 text-xs">Marcar como não lido</ConfirmButton>}
                      <ConfirmButton action={deleteMessageAction.bind(null, msg.id)} confirm="Apagar esse e-mail?" variant="danger" className="px-3 py-1.5 text-xs"><Trash2 className="size-3.5" /> Apagar</ConfirmButton>
                    </span>
                  </div>
                  <div className="px-5 py-4">
                    <h2 className="text-lg font-bold text-zinc-900">{msg.subject}</h2>
                    <div className="mt-1 text-sm text-zinc-600">
                      {msg.direction === "IN" ? (
                        <>De <b className="text-zinc-800">{msg.fromName ? `${msg.fromName} <${msg.fromAddr}>` : msg.fromAddr}</b></>
                      ) : (
                        <>Para <b className="text-zinc-800">{msg.toAddr}</b></>
                      )}{" "}
                      · {when(msg.receivedAt)}
                    </div>
                    {((msg.attachments ?? []) as MailAttachment[]).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {((msg.attachments ?? []) as MailAttachment[]).map((a, i) => (
                          <a key={i} href={`/api/emails/file/${msg!.id}/${i}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-100 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-200">
                            <Paperclip className="size-3.5" /> {a.name} <span className="text-zinc-400">{kb(a.size)}</span>
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                  {msg.html ? (
                    <iframe title="Conteúdo do e-mail" sandbox="allow-popups allow-popups-to-escape-sandbox" srcDoc={safeDoc(msg.html)} className="h-[65vh] w-full border-t border-zinc-100 bg-white" />
                  ) : (
                    <pre className="whitespace-pre-wrap break-words border-t border-zinc-100 px-5 py-4 font-sans text-sm text-zinc-800">{msg.text ?? "(sem conteúdo)"}</pre>
                  )}
                </Card>
              ) : (
                <>
                  <div className="flex flex-wrap items-center gap-2">
                    {[
                      ["IN", "Recebidos", Inbox],
                      ["OUT", "Enviados", Send],
                    ].map(([k, label, Icon]) => {
                      const I = Icon as typeof Inbox;
                      return (
                        <Link key={k as string} href={`${base}${k === "OUT" ? "&pasta=enviados" : ""}`} className={clsx("inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-semibold", pasta === k ? "bg-zinc-900 text-white" : "bg-zinc-100 text-zinc-700 hover:bg-zinc-200")}>
                          <I className="size-4" /> {label as string}
                        </Link>
                      );
                    })}
                    <form className="ml-auto">
                      <input type="hidden" name="caixa" value={box.id} />
                      {pasta === "OUT" && <input type="hidden" name="pasta" value="enviados" />}
                      <Input name="q" defaultValue={q} placeholder="Buscar por assunto ou remetente" className="w-64 max-w-full" />
                    </form>
                  </div>
                  {list.length === 0 ? (
                    <Empty icon={<Inbox className="size-5" />}>{q ? "Nada encontrado." : pasta === "IN" ? `Nenhum e-mail recebido em ${box.address} ainda.` : "Nenhum e-mail enviado."}</Empty>
                  ) : (
                    <div className="divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                      {list.map((m) => {
                        const unread = pasta === "IN" && !m.readAt;
                        return (
                          <Link key={m.id} href={`${base}&msg=${m.id}${pasta === "OUT" ? "&pasta=enviados" : ""}`} className={clsx("flex items-start gap-3 px-4 py-3 hover:bg-orange-50/40", unread && "bg-sky-50/40")}>
                            <span className={clsx("mt-1.5 size-2 shrink-0 rounded-full", unread ? "bg-sky-500" : "bg-transparent")} />
                            <span className="min-w-0 flex-1">
                              <span className="flex items-center gap-2">
                                <span className={clsx("truncate text-sm", unread ? "font-bold text-zinc-900" : "font-medium text-zinc-700")}>{pasta === "IN" ? m.fromName || m.fromAddr : `Para ${m.toAddr}`}</span>
                                {((m.attachments ?? []) as MailAttachment[]).length > 0 && <Paperclip className="size-3.5 shrink-0 text-zinc-400" />}
                                <span className="ml-auto shrink-0 text-xs text-zinc-500">{when(m.receivedAt)}</span>
                              </span>
                              <span className={clsx("block truncate text-sm", unread ? "font-semibold text-zinc-900" : "text-zinc-700")}>{m.subject}</span>
                              <span className="block truncate text-xs text-zinc-500">{(m.text ?? "").replace(/\s+/g, " ").slice(0, 140)}</span>
                            </span>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
