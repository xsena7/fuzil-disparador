import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "dark";
const btn: Record<BtnVariant, string> = {
  primary: "bg-brand-gradient text-white shadow-sm shadow-orange-500/25 hover:brightness-105 active:brightness-95",
  dark: "bg-ink text-white hover:bg-zinc-800",
  secondary: "border border-orange-200 bg-orange-50 text-orange-800 shadow-soft hover:border-orange-300 hover:bg-orange-100 hover:text-orange-900",
  danger: "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100",
  ghost: "text-zinc-600 hover:bg-orange-50 hover:text-orange-800",
};
const btnBase =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-300 disabled:opacity-50 disabled:pointer-events-none";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: BtnVariant }) {
  return <button className={clsx(btnBase, btn[variant], className)} {...props} />;
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: BtnVariant }) {
  return <Link className={clsx(btnBase, btn[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("rounded-2xl border border-zinc-200/70 bg-white shadow-soft", className)} {...props} />;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div data-tour="page-header" className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div className="flex gap-3.5">
        <span aria-hidden className="mt-1 h-8 w-1.5 shrink-0 rounded-full bg-brand-gradient" />
        <div>
          <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-zinc-900">{title}</h1>
          {description && <p className="mt-1.5 max-w-3xl text-zinc-600">{description}</p>}
        </div>
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const badge = {
  green: "bg-emerald-100 text-emerald-800 ring-emerald-600/20",
  yellow: "bg-amber-100 text-amber-800 ring-amber-600/25",
  red: "bg-rose-100 text-rose-800 ring-rose-600/20",
  blue: "bg-sky-100 text-sky-800 ring-sky-600/20",
  gray: "bg-zinc-100 text-zinc-700 ring-zinc-500/15",
  orange: "bg-orange-100 text-orange-800 ring-orange-600/20",
};
export type BadgeColor = keyof typeof badge;

export function Badge({ color = "gray", children, dot = true }: { color?: BadgeColor; children: ReactNode; dot?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset", badge[color])}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-zinc-800">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

const inputCls =
  "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-2.5 text-sm shadow-soft outline-none transition placeholder:text-zinc-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-100 disabled:bg-zinc-50 disabled:text-zinc-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(inputCls, className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(inputCls, className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx(inputCls, "pr-8", className)} {...props} />;
}

export type StatTone = "green" | "red" | "brand" | "blue" | "violet" | "pink" | "amber" | "default";
const STAT: Record<StatTone, { box: string; bar: string; value: string; icon: string }> = {
  green: { box: "border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-white", bar: "bg-emerald-500", value: "text-emerald-700", icon: "bg-emerald-100 text-emerald-700" },
  red: { box: "border-rose-200/80 bg-gradient-to-br from-rose-50 to-white", bar: "bg-rose-500", value: "text-rose-700", icon: "bg-rose-100 text-rose-700" },
  brand: { box: "border-orange-200/80 bg-gradient-to-br from-orange-50 to-white", bar: "bg-brand-gradient", value: "text-orange-700", icon: "bg-orange-100 text-orange-700" },
  blue: { box: "border-sky-200/80 bg-gradient-to-br from-sky-50 to-white", bar: "bg-sky-500", value: "text-sky-700", icon: "bg-sky-100 text-sky-700" },
  violet: { box: "border-violet-200/80 bg-gradient-to-br from-violet-50 to-white", bar: "bg-violet-500", value: "text-violet-700", icon: "bg-violet-100 text-violet-700" },
  pink: { box: "border-pink-200/80 bg-gradient-to-br from-pink-50 to-white", bar: "bg-pink-500", value: "text-pink-700", icon: "bg-pink-100 text-pink-700" },
  amber: { box: "border-amber-200/80 bg-gradient-to-br from-amber-50 to-white", bar: "bg-amber-400", value: "text-amber-700", icon: "bg-amber-100 text-amber-700" },
  default: { box: "border-zinc-200/80 bg-white", bar: "bg-zinc-300", value: "text-zinc-900", icon: "bg-zinc-100 text-zinc-600" },
};

export function Stat({ label, value, sub, tone = "default", icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: StatTone; icon?: ReactNode }) {
  const t = STAT[tone];
  return (
    <div className={clsx("relative overflow-hidden rounded-2xl border p-5 pt-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lift animate-fade-up", t.box)}>
      <span aria-hidden className={clsx("absolute inset-x-0 top-0 h-1", t.bar)} />
      <div className="flex items-center justify-between gap-2">
        <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{label}</div>
        {icon && <div className={clsx("flex size-8 items-center justify-center rounded-lg", t.icon)}>{icon}</div>}
      </div>
      <div className={clsx("mt-2 text-[1.7rem] font-bold leading-tight tracking-tight tabular-nums", t.value)}>{value}</div>
      {sub && <div className="mt-1 text-xs font-medium text-zinc-500">{sub}</div>}
    </div>
  );
}

export function Empty({ children, icon }: { children: ReactNode; icon?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-12 text-center text-zinc-500">
      {icon && <div className="flex size-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">{icon}</div>}
      {children}
    </div>
  );
}

/** Tabela padrão. `maxHeight` = altura máxima com barra de rolagem (o cabeçalho fica parado no topo). */
export function Table({ head, children, maxHeight }: { head: ReactNode[]; children: ReactNode; maxHeight?: string }) {
  return (
    <div className={clsx("overflow-x-auto rounded-2xl border border-zinc-200/70 bg-white shadow-soft", maxHeight && "overflow-y-auto")} style={maxHeight ? { maxHeight } : undefined}>
      <table className="w-full text-left text-sm">
        <thead className={clsx("border-b border-zinc-200 bg-zinc-100 text-xs uppercase tracking-wide text-zinc-700", maxHeight && "sticky top-0 z-10")}>
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-semibold">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 [&>tr:nth-child(even)]:bg-zinc-50/50 [&>tr]:transition-colors [&>tr:hover]:bg-orange-50/60">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={clsx("px-4 py-3 align-middle", className)} {...props} />;
}
