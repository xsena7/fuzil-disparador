import type { ReactNode } from "react";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";

export type DrawerTone = "green" | "amber" | "red" | "gray";

const DOT: Record<DrawerTone, string> = { green: "bg-emerald-500", amber: "bg-amber-400", red: "bg-red-500", gray: "bg-zinc-300" };

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
}) {
  return (
    <details open={open} className={clsx("group overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm", className)}>
      <summary className="flex cursor-pointer list-none flex-wrap items-center gap-3 px-5 py-3.5 hover:bg-zinc-50 [&::-webkit-details-marker]:hidden">
        <ChevronRight className="size-4 shrink-0 text-zinc-400 transition-transform group-open:rotate-90" />
        {tone && <StatusDot tone={tone} title={toneTitle} />}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold">{title}</span>
          {subtitle && <span className="block truncate text-xs text-zinc-500">{subtitle}</span>}
        </span>
        {meta && <span className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-500">{meta}</span>}
      </summary>
      <div className={clsx("border-t border-zinc-100", bodyClassName ?? "p-5")}>{children}</div>
    </details>
  );
}

/** Um número em destaque no resumo da gaveta: "12.000 disponíveis". */
export function MetaItem({ value, label }: { value: ReactNode; label: string }) {
  return (
    <span>
      <b className="font-semibold text-zinc-800">{value}</b> {label}
    </span>
  );
}
