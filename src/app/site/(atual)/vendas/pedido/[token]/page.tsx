import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicOrder } from "@/lib/market";
import { sitePath } from "@/lib/site-path";
import { OrderLive } from "./order-live";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Seu pedido · Fuzil Disparador", robots: { index: false, follow: false } };

export default async function OrderPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const o = await publicOrder(token);
  if (!o) notFound();
  return (
    <div className="min-h-[70vh] bg-ink px-5 py-12 text-zinc-300">
      <OrderLive token={token} initial={o} shopHref={await sitePath("/vendas")} />
    </div>
  );
}
