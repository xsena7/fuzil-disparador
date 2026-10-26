import Link from "next/link";
import clsx from "clsx";
import { ExternalLink, Inbox, Mail, Package, RefreshCw, ShoppingBag, Store } from "lucide-react";
import { prisma } from "@/lib/db";
import { decrypt } from "@/lib/crypto";
import { brlCents, siteUrl, stockByProduct } from "@/lib/market";
import { inboxConfigured } from "@/lib/market-inbox";
import { requireFinancePartner } from "@/lib/finance-partners";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { Badge, Card, Empty, Field, Input, PageHeader, Select, Stat, Textarea } from "@/components/ui";
import { Drawer, MetaItem, type DrawerTone } from "@/components/drawer";
import {
  addItemsAction,
  assignInviteAction,
  deleteProductAction,
  deliverAgainAction,
  markPaidAction,
  pollInboxNowAction,
  recheckInviteAction,
  removeItemAction,
  replaceItemAction,
  saveProductAction,
  toggleItemAction,
  unassignInviteAction,
} from "@/app/actions/market";

export const dynamic = "force-dynamic";

const TZ = "America/Sao_Paulo";
const when = (d: Date) => d.toLocaleString("pt-BR", { timeZone: TZ, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
const TABS = [
  { key: "pedidos", label: "Pedidos", icon: ShoppingBag },
  { key: "estoque", label: "Estoque", icon: Package },
  { key: "convites", label: "Convites", icon: Inbox },
  { key: "produtos", label: "Produtos", icon: Store },
] as const;

const ORDER: Record<string, { label: string; tone: DrawerTone; color: "green" | "yellow" | "red" | "gray" | "blue" }> = {
  PENDING: { label: "Esperando Pix", tone: "amber", color: "yellow" },
  PAID: { label: "Pago, falta entregar", tone: "red", color: "red" },
  DELIVERED: { label: "Entregue", tone: "green", color: "green" },
  EXPIRED: { label: "Não pagou", tone: "gray", color: "gray" },
  CANCELLED: { label: "Cancelado", tone: "gray", color: "gray" },
};

type ItemWithInvite = { status: string; invite: { check: string | null; usedAt: Date | null } | null };
function itemState(i: ItemWithInvite): { label: string; color: "green" | "yellow" | "red" | "gray" | "blue" } {
  if (i.status === "SOLD") return { label: "Vendida", color: "blue" };
  if (i.status === "RESERVED") return { label: "Reservada", color: "yellow" };
  if (i.status === "DISABLED") return { label: "Fora da vitrine", color: "gray" };
  if (!i.invite) return { label: "Sem convite", color: "red" };
  if (i.invite.check === "INVALID") return { label: "Convite não funciona", color: "red" };
  if (i.invite.check !== "OK") return { label: "Testando convite", color: "yellow" };
  return { label: "À venda", color: "green" };
}

/** Vendas de BM: pedidos, estoque, convites que chegaram no e-mail e produtos da vitrine. Só os sócios. */
export default async function VendasPage({ searchParams }: { searchParams: Promise<{ aba?: string }> }) {
  const auth = await requireFinancePartner();
  const aba = (await searchParams).aba ?? "pedidos";
  const monthStart = new Date(new Date().toLocaleString("en-US", { timeZone: TZ }));
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [products, stock, orders, items, invites, bms, statusRow, monthSales] = await Promise.all([
    prisma.marketProduct.findMany({ orderBy: [{ sort: "asc" }, { createdAt: "asc" }], include: { _count: { select: { items: true } } } }),
    stockByProduct(),
    prisma.marketOrder.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { product: { select: { name: true } }, items: { include: { invite: true } } } }),
    prisma.marketItem.findMany({ orderBy: { createdAt: "desc" }, include: { invite: true, product: { select: { name: true } }, order: { select: { name: true, email: true } } } }),
    prisma.marketInvite.findMany({ orderBy: { receivedAt: "desc" }, take: 100, include: { item: { select: { bmName: true, status: true } } } }),
    prisma.businessManager.findMany({ where: { workspaceId: auth.workspace.id }, orderBy: { name: "asc" }, select: { id: true, name: true, marketItems: { where: { status: { not: "SOLD" } }, select: { id: true } } } }),
    prisma.platformSetting.findUnique({ where: { key: "MARKET_INBOX_STATUS" } }),
    prisma.marketOrder.aggregate({ where: { status: { in: ["PAID", "DELIVERED"] }, paidAt: { gte: monthStart } }, _sum: { totalCents: true }, _count: true }),
  ]);
  let inbox: { at: string; ok: boolean; text: string } | null = null;
  try {
    inbox = statusRow ? JSON.parse(decrypt(statusRow.value)) : null;
  } catch {
    inbox = null;
  }
  const forSale = [...stock.values()].reduce((a, n) => a + n, 0);
  const noInvite = items.filter((i) => (i.status === "AVAILABLE" || i.status === "DISABLED") && !i.invite).length;
  const toDeliver = orders.filter((o) => o.status === "PAID").length;
  const freeItems = items.filter((i) => !i.invite && i.status !== "SOLD");
  const vitrineUrl = `${siteUrl()}/vendas`;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Vendas"
        description="BMs à venda na vitrine, pedidos pagos no Pix e convites que chegam no e-mail do estoque."
        actions={
          <a href={vitrineUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50">
            Ver a vitrine <ExternalLink className="size-4" />
          </a>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Vendido no mês" value={brlCents(monthSales._sum.totalCents ?? 0)} tone="green" sub={`${monthSales._count} pedido(s)`} />
        <Stat label="À venda agora" value={forSale} tone="brand" sub="BMs com convite testado" />
        <Stat label="Sem convite" value={noInvite} tone={noInvite ? "amber" : "default"} sub="não aparecem na vitrine" />
        <Stat label="Falta entregar" value={toDeliver} tone={toDeliver ? "red" : "default"} sub="pagos e não entregues" />
      </div>

      <div className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link key={t.key} href={`/vendas?aba=${t.key}`} className={clsx("inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition", aba === t.key ? "bg-brand-gradient text-white shadow-sm" : "border border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100")}>
            <t.icon className="size-4" /> {t.label}
          </Link>
        ))}
      </div>

      {aba === "pedidos" && (
        <div className="space-y-3">
          {orders.length === 0 && <Empty icon={<ShoppingBag className="size-5" />}>Nenhum pedido ainda. Quando alguém comprar na vitrine, aparece aqui.</Empty>}
          {orders.map((o) => {
            const st = ORDER[o.status] ?? ORDER.CANCELLED;
            return (
              <Drawer
                key={o.id}
                tone={st.tone}
                toneTitle={st.label}
                open={o.status === "PAID"}
                title={`${o.name} · ${o.quantity}x ${o.product.name}`}
                subtitle={`${o.email}${o.phone ? ` · ${o.phone}` : ""} · ${when(o.createdAt)}`}
                meta={
                  <>
                    <Badge color={st.color}>{st.label}</Badge>
                    <MetaItem value={brlCents(o.totalCents)} label="" />
                  </>
                }
              >
                {o.error && <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800">{o.error}</p>}
                <div className="space-y-2">
                  {o.items.length === 0 && <p className="text-sm text-zinc-500">Nenhuma BM separada.</p>}
                  {o.items.map((i) => (
                    <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm ring-1 ring-zinc-200/70">
                      <span className="font-semibold text-zinc-900">{i.bmName}</span>
                      <Badge color={itemState(i).color}>{itemState(i).label}</Badge>
                      {i.invite?.url && <a href={i.invite.url} target="_blank" rel="noreferrer" className="truncate text-xs text-orange-700 hover:underline">{i.invite.url}</a>}
                      {i.status === "SOLD" && (
                        <span className="ml-auto">
                          <ConfirmButton action={replaceItemAction.bind(null, o.id, i.id)} confirm={`Trocar a BM "${i.bmName}" deste pedido?\nO cliente recebe outra BM do mesmo tipo, com convite novo por e-mail. Só troque se o convite não funcionou ou a conta chegou banida.`} className="px-3 py-1.5 text-xs">
                            Trocar BM
                          </ConfirmButton>
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {(o.status === "PAID" || o.status === "DELIVERED") && (
                    <ConfirmButton action={deliverAgainAction.bind(null, o.id)} className="px-3 py-1.5 text-xs">
                      <Mail className="size-3.5" /> {o.status === "PAID" ? "Entregar agora" : "Mandar o e-mail de novo"}
                    </ConfirmButton>
                  )}
                  {(o.status === "PENDING" || o.status === "EXPIRED" || o.status === "CANCELLED") && (
                    <ConfirmButton action={markPaidAction.bind(null, o.id)} confirm="Marcar como pago e entregar?\nSó use se o cliente pagou por fora (ex.: Pix direto na sua chave)." className="px-3 py-1.5 text-xs">
                      Marcar como pago
                    </ConfirmButton>
                  )}
                  {o.mpPaymentId && <span className="self-center text-xs text-zinc-400">Mercado Pago #{o.mpPaymentId}</span>}
                </div>
              </Drawer>
            );
          })}
        </div>
      )}

      {aba === "estoque" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-1 font-semibold">Colocar BMs no estoque</div>
            <p className="mb-4 text-sm text-zinc-500">
              Depois, convide o e-mail do estoque em cada BM (Configurações do negócio → Pessoas → Convidar). O Fuzil pega o convite sozinho, testa o link e a BM entra na vitrine.
            </p>
            {products.length === 0 ? (
              <p className="text-sm text-amber-700">Crie um produto primeiro, na aba Produtos.</p>
            ) : (
              <ActionForm action={addItemsAction} submit="Colocar no estoque">
                <div className="grid gap-4 md:grid-cols-[1fr_2fr]">
                  <Field label="Produto">
                    <Select name="productId" required defaultValue={products[0]?.id}>
                      {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </Select>
                  </Field>
                  <Field label="Ou digite o nome de BMs que não estão conectadas" hint="Um nome por linha, igualzinho ao nome da BM na Meta (é por ele que o convite é reconhecido)">
                    <Textarea name="names" rows={2} placeholder={"Loja Azul Ltda\nMed Watt"} />
                  </Field>
                </div>
                {bms.length > 0 && (
                  <div className="mt-4">
                    <div className="mb-2 text-sm font-medium text-zinc-700">BMs conectadas na sua conta</div>
                    <div className="grid max-h-60 gap-1.5 overflow-auto rounded-xl border border-zinc-200 p-3 sm:grid-cols-2 lg:grid-cols-3">
                      {bms.map((b) => (
                        <label key={b.id} className={clsx("flex items-center gap-2 text-sm", b.marketItems.length && "text-zinc-400")}>
                          <input type="checkbox" name="businessId" value={b.id} disabled={b.marketItems.length > 0} /> {b.name}
                          {b.marketItems.length > 0 && <span className="text-xs">(já no estoque)</span>}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </ActionForm>
            )}
          </Card>
          {products.map((p) => {
            const mine = items.filter((i) => i.productId === p.id);
            const sale = stock.get(p.id) ?? 0;
            return (
              <Drawer key={p.id} tone={sale ? "green" : mine.length ? "amber" : "gray"} title={p.name} subtitle={`${brlCents(p.priceCents)} por BM${p.active ? "" : " · fora da vitrine"}`} meta={<><MetaItem value={sale} label="à venda" /><MetaItem value={mine.filter((i) => i.status === "SOLD").length} label="vendidas" /></>}>
                {mine.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nenhuma BM nesse produto.</p>
                ) : (
                  <div className="space-y-2">
                    {mine.map((i) => {
                      const s = itemState(i);
                      return (
                        <div key={i.id} className="flex flex-wrap items-center gap-3 rounded-xl bg-zinc-50 px-3 py-2 text-sm ring-1 ring-zinc-200/70">
                          <span className="font-semibold text-zinc-900">{i.bmName}</span>
                          <Badge color={s.color}>{s.label}</Badge>
                          {i.invite?.checkNote && i.invite.check !== "OK" && <span className="text-xs text-zinc-500">{i.invite.checkNote}</span>}
                          {i.order && <span className="text-xs text-zinc-500">→ {i.order.name} ({i.order.email})</span>}
                          {(i.status === "AVAILABLE" || i.status === "DISABLED") && (
                            <span className="ml-auto flex gap-1.5">
                              <ConfirmButton action={toggleItemAction.bind(null, i.id)} className="px-3 py-1.5 text-xs">{i.status === "AVAILABLE" ? "Tirar da vitrine" : "Pôr na vitrine"}</ConfirmButton>
                              <ConfirmButton action={removeItemAction.bind(null, i.id)} confirm={`Tirar "${i.bmName}" do estoque?`} variant="danger" className="px-3 py-1.5 text-xs">Apagar</ConfirmButton>
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </Drawer>
            );
          })}
        </div>
      )}

      {aba === "convites" && (
        <div className="space-y-4">
          <Card className="flex flex-wrap items-center gap-4 p-5">
            <span className={clsx("flex size-10 items-center justify-center rounded-xl text-white", !inboxConfigured() ? "bg-zinc-400" : inbox?.ok === false ? "bg-red-500" : "bg-emerald-600")}><Mail className="size-5" /></span>
            <div className="min-w-0 flex-1 text-sm">
              <div className="font-semibold text-zinc-900">E-mail do estoque</div>
              {!inboxConfigured() ? (
                <div className="text-zinc-500">Ainda não configurado. Coloque o servidor, o e-mail e a senha em Admin → gaveta Vendas.</div>
              ) : inbox ? (
                <div className={inbox.ok ? "text-zinc-600" : "text-red-700"}>{inbox.ok ? "Funcionando" : "Erro"} · {inbox.text} · {when(new Date(inbox.at))}</div>
              ) : (
                <div className="text-zinc-500">Configurado. O Fuzil lê a caixa a cada minuto.</div>
              )}
            </div>
            <ConfirmButton action={pollInboxNowAction} className="px-3 py-1.5 text-xs"><RefreshCw className="size-3.5" /> Ler agora</ConfirmButton>
          </Card>
          {invites.length === 0 && <Empty icon={<Inbox className="size-5" />}>Nenhum e-mail lido ainda.</Empty>}
          {invites.map((inv) => {
            const tone: DrawerTone = !inv.url ? "gray" : inv.check === "OK" ? "green" : inv.check === "INVALID" ? "red" : "amber";
            return (
              <Drawer
                key={inv.id}
                tone={tone}
                title={inv.bmName ?? inv.subject}
                subtitle={`${inv.fromAddr} · ${when(inv.receivedAt)}`}
                meta={
                  <>
                    {inv.usedAt ? <Badge color="blue">Entregue</Badge> : inv.item ? <Badge color="green">BM: {inv.item.bmName}</Badge> : inv.url ? <Badge color="yellow">Sem BM ligada</Badge> : <Badge color="gray">Sem convite</Badge>}
                    {inv.url && <Badge color={inv.check === "OK" ? "green" : inv.check === "INVALID" ? "red" : "yellow"}>{inv.check === "OK" ? "Link responde" : inv.check === "INVALID" ? "Link não funciona" : "Não testado"}</Badge>}
                  </>
                }
              >
                <div className="space-y-3 text-sm">
                  <div className="text-zinc-600"><b className="text-zinc-900">Assunto:</b> {inv.subject}</div>
                  {inv.url && <a href={inv.url} target="_blank" rel="noreferrer" className="block break-all text-orange-700 hover:underline">{inv.url}</a>}
                  {inv.checkNote && <div className="text-xs text-zinc-500">{inv.checkNote}{inv.checkedAt ? ` · testado ${when(inv.checkedAt)}` : ""}</div>}
                  {!inv.usedAt && inv.url && (
                    <div className="flex flex-wrap items-end gap-2">
                      <ConfirmButton action={recheckInviteAction.bind(null, inv.id)} className="px-3 py-1.5 text-xs">Testar o link de novo</ConfirmButton>
                      {inv.item ? (
                        <ConfirmButton action={unassignInviteAction.bind(null, inv.id)} className="px-3 py-1.5 text-xs">Soltar da BM</ConfirmButton>
                      ) : freeItems.length ? (
                        <ActionForm action={assignInviteAction.bind(null, inv.id)} submit="Ligar à BM" variant="secondary" className="flex flex-wrap items-end gap-2 [&>div]:mt-0">
                          <Select name="itemId" required defaultValue="" className="w-64">
                            <option value="" disabled>Escolha a BM do estoque</option>
                            {freeItems.map((i) => <option key={i.id} value={i.id}>{i.bmName} · {i.product.name}</option>)}
                          </Select>
                        </ActionForm>
                      ) : (
                        <span className="text-xs text-zinc-500">Coloque essa BM no estoque (aba Estoque) com o mesmo nome, e o convite liga sozinho.</span>
                      )}
                    </div>
                  )}
                </div>
              </Drawer>
            );
          })}
        </div>
      )}

      {aba === "produtos" && (
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-4 font-semibold">Novo produto</div>
            <ProductForm />
          </Card>
          {products.map((p) => (
            <Drawer key={p.id} tone={p.active ? "green" : "gray"} title={p.name} subtitle={p.kind === "TEMPLATE" ? "Com template aprovado" : "Sem template"} meta={<><MetaItem value={brlCents(p.priceCents)} label="" /><MetaItem value={stock.get(p.id) ?? 0} label="à venda" /></>}>
              <ProductForm product={p} />
              <div className="mt-4 border-t border-zinc-100 pt-4">
                <ConfirmButton action={deleteProductAction.bind(null, p.id)} confirm={`Apagar o produto "${p.name}"?${p._count.items ? `\nAs ${p._count.items} BM(s) do estoque dele também saem.` : ""}`} variant="danger" className="px-3 py-1.5 text-xs">Apagar produto</ConfirmButton>
              </div>
            </Drawer>
          ))}
        </div>
      )}
    </div>
  );
}

function ProductForm({ product }: { product?: { id: string; name: string; description: string; kind: string; priceCents: number; sort: number; active: boolean } }) {
  return (
    <ActionForm action={saveProductAction} submit={product ? "Salvar" : "Criar produto"}>
      {product && <input type="hidden" name="id" value={product.id} />}
      <div className="grid gap-4 md:grid-cols-[2fr_1fr_1fr]">
        <Field label="Nome na vitrine">
          <Input name="name" defaultValue={product?.name} placeholder="BM com template aprovado" required maxLength={80} />
        </Field>
        <Field label="Tipo">
          <Select name="kind" defaultValue={product?.kind ?? "TEMPLATE"}>
            <option value="TEMPLATE">Com template</option>
            <option value="NO_TEMPLATE">Sem template</option>
          </Select>
        </Field>
        <Field label="Preço por BM (R$)">
          <Input name="price" defaultValue={product ? (product.priceCents / 100).toFixed(2).replace(".", ",") : ""} placeholder="50,00" inputMode="decimal" required />
        </Field>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[3fr_1fr]">
        <Field label="Descrição (opcional)">
          <Input name="description" defaultValue={product?.description} placeholder="Ex.: limite de 250/dia, número registrado, pronta para disparar" maxLength={300} />
        </Field>
        <Field label="Ordem na vitrine">
          <Input name="sort" type="number" min={0} max={999} defaultValue={product?.sort ?? 0} />
        </Field>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm text-zinc-700">
        <input type="checkbox" name="active" defaultChecked={product?.active ?? true} /> Aparece na vitrine
      </label>
    </ActionForm>
  );
}
