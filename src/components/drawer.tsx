import type { ReactNode } from "react";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";

export type DrawerTone = "green" | "amber" | "red" | "gray";

const DOT: Record<DrawerTone, string> = { green: "bg-emerald-500", amber: "bg-amber-400", red: "bg-red-500", gray: "bg-zinc-300" };
// Faixa do lado esquerdo da gaveta e fundo do topo quando aberta
const STRIPE: Record<DrawerTone, string> = { green: "border-l-emerald-500", amber: "border-l-amber-400", red: "border-l-red-500", gray: "border-l-zinc-300" };

/** Bolinha de status usada nas gavetas fechadas. */
export function StatusDot({ tone, title }: { tone: DrawerTone; title?: string }) {
  return <span className={clsx("size-2.5 shrink-0 rounded-full", DOT[tone])} title={title} />;
}

/**
 * Gaveta: fechada mostra só o essencial (título, bolinha de status e um resumo à direita);
 * aberta mostra o resto. Funciona sem JavaScript (details/summary).
 */
export function Drawer({
  title,
  subtitle,
  tone,
  toneTitle,
  meta,
  open,
  children,
  className,
  bodyClassName,
  stripe,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  tone?: DrawerTone;
  toneTitle?: string;
  meta?: ReactNode;
  open?: boolean;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
  /** Cor da faixa do lado (classe border-l-*), quando a gaveta não tem status */
  stripe?: string;
}) {
  return (
    <details open={open} className={clsx("group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm transition hover:shadow-lift open:shadow-lift", (tone || stripe) && ["border-l-[5px]", stripe ?? STRIPE[tone!]], className)}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-4 transition-colors hover:bg-orange-50/50 group-open:bg-zinc-50/80 [&::-webkit-details-marker]:hidden">
        <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-500 transition group-open:bg-brand-gradient group-open:text-white group-hover:bg-orange-100 group-hover:text-orange-700">
          <ChevronRight className="size-4 transition-transform group-open:rotate-90" />
        </span>
        {tone && <StatusDot tone={tone} title={toneTitle} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[0.95rem] font-semibold text-zinc-900">{title}</span>
          {subtitle && <span className="block truncate text-xs text-zinc-500">{subtitle}</span>}
        </span>
        {meta && <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-600">{meta}</span>}
      </summary>
      <div className={clsx("border-t border-zinc-100", bodyClassName ?? "p-5")}>{children}</div>
    </details>
  );
}

/** Um número em destaque no resumo da gaveta: "12.000 disponíveis". */
export function MetaItem({ value, label }: { value: ReactNode; label: string }) {
  return (
    <span>
      <b className="text-sm font-bold text-zinc-900">{value}</b> {label}
    </span>
  );
}
