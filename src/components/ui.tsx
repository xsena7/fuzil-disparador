import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type BtnVariant = "primary" | "secondary" | "danger" | "ghost" | "dark";
const btn: Record<BtnVariant, string> = {
  primary: "bg-brand-gradient text-white shadow-sm shadow-orange-500/25 hover:brightness-105 active:brightness-95",
  dark: "bg-ink text-white hover:bg-zinc-800",
  secondary: "border border-zinc-200 bg-white text-zinc-700 shadow-soft hover:bg-zinc-50 hover:text-zinc-900",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
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
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4 animate-fade-up">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">{title}</h1>
        {description && <p className="mt-1.5 max-w-3xl text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const badge = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  yellow: "bg-amber-50 text-amber-700 ring-amber-600/20",
  red: "bg-rose-50 text-rose-700 ring-rose-600/15",
  blue: "bg-sky-50 text-sky-700 ring-sky-600/15",
  gray: "bg-zinc-100 text-zinc-600 ring-zinc-500/10",
  orange: "bg-brand-50 text-brand-700 ring-brand-600/15",
};
export type BadgeColor = keyof typeof badge;

export function Badge({ color = "gray", children, dot = true }: { color?: BadgeColor; children: ReactNode; dot?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset", badge[color])}>
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</span>
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

export function Stat({ label, value, sub, tone, icon }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "green" | "red" | "brand" | "default"; icon?: ReactNode }) {
  return (
    <div
      className={clsx(
        "relative overflow-hidden rounded-2xl border p-5 shadow-soft transition hover:shadow-lift animate-fade-up",
        tone === "green" && "border-emerald-200/70 bg-gradient-to-br from-emerald-50 to-white",
        tone === "red" && "border-rose-200/70 bg-gradient-to-br from-rose-50 to-white",
        tone === "brand" && "border-brand-200/70 bg-gradient-to-br from-brand-50 to-white",
        (!tone || tone === "default") && "border-zinc-200/70 bg-white",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</div>
        {icon && <div className="text-zinc-400">{icon}</div>}
      </div>
      <div
        className={clsx(
          "mt-2 text-2xl font-semibold tracking-tight tabular-nums",
          tone === "green" && "text-emerald-700",
          tone === "red" && "text-rose-700",
          tone === "brand" && "text-brand-700",
        )}
      >
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-zinc-500">{sub}</div>}
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

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-zinc-200/70 bg-white shadow-soft">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-zinc-100 bg-zinc-50/70 text-xs uppercase tracking-wide text-zinc-500">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-3 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-zinc-100 [&>tr]:transition-colors [&>tr:hover]:bg-zinc-50/60">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={clsx("px-4 py-3 align-middle", className)} {...props} />;
}
