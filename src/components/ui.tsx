import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type BtnVariant = "primary" | "secondary" | "danger" | "ghost";
const btn: Record<BtnVariant, string> = {
  primary: "bg-zinc-900 text-white hover:bg-zinc-800",
  secondary: "border border-zinc-200 bg-white hover:bg-zinc-50",
  danger: "border border-red-200 bg-white text-red-600 hover:bg-red-50",
  ghost: "hover:bg-zinc-100",
};
const btnBase = "inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2 font-medium transition disabled:opacity-50 disabled:pointer-events-none";

export function Button({ variant = "primary", className, ...props }: ComponentProps<"button"> & { variant?: BtnVariant }) {
  return <button className={clsx(btnBase, btn[variant], className)} {...props} />;
}

export function LinkButton({ variant = "primary", className, ...props }: ComponentProps<typeof Link> & { variant?: BtnVariant }) {
  return <Link className={clsx(btnBase, btn[variant], className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("rounded-xl border border-zinc-200 bg-white", className)} {...props} />;
}

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {description && <p className="mt-1 text-zinc-500">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const badge = {
  green: "bg-emerald-50 text-emerald-700 border-emerald-200",
  yellow: "bg-amber-50 text-amber-700 border-amber-200",
  red: "bg-red-50 text-red-700 border-red-200",
  blue: "bg-sky-50 text-sky-700 border-sky-200",
  gray: "bg-zinc-50 text-zinc-600 border-zinc-200",
  orange: "bg-brand-50 text-brand-700 border-brand-100",
};
export type BadgeColor = keyof typeof badge;

export function Badge({ color = "gray", children, dot = true }: { color?: BadgeColor; children: ReactNode; dot?: boolean }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2 py-0.5 text-xs font-medium", badge[color])}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-medium">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
    </label>
  );
}

const inputCls = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 outline-none focus:border-zinc-400 focus:ring-2 focus:ring-zinc-100 disabled:bg-zinc-50 disabled:text-zinc-500";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={clsx(inputCls, className)} {...props} />;
}
export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={clsx(inputCls, className)} {...props} />;
}
export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={clsx(inputCls, className)} {...props} />;
}

export function Stat({ label, value, sub, tone }: { label: string; value: ReactNode; sub?: ReactNode; tone?: "green" | "red" | "default" }) {
  return (
    <div className={clsx("rounded-xl border p-4", tone === "green" ? "border-emerald-200 bg-emerald-50" : tone === "red" ? "border-red-200 bg-red-50" : "border-zinc-200 bg-white")}>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={clsx("mt-1 text-2xl font-semibold", tone === "green" && "text-emerald-700", tone === "red" && "text-red-700")}>{value}</div>
      {sub && <div className="mt-0.5 text-xs text-zinc-500">{sub}</div>}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed border-zinc-200 bg-white p-10 text-center text-zinc-500">{children}</div>;
}

export function Table({ head, children }: { head: ReactNode[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-200 bg-white">
      <table className="w-full text-left">
        <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
          <tr>{head.map((h, i) => <th key={i} className="px-4 py-2.5 font-medium">{h}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, ...props }: ComponentProps<"td">) {
  return <td className={clsx("px-4 py-2.5 align-middle", className)} {...props} />;
}
