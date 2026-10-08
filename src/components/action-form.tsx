"use client";

import { useActionState, type ReactNode } from "react";
import type { FormState } from "@/app/actions/auth";
import { Button } from "./ui";

/** Formulário genérico com mensagem de erro/sucesso. */
export function ActionForm({
  action,
  children,
  submit,
  className,
  variant = "primary",
}: {
  action: (state: FormState, form: FormData) => Promise<FormState>;
  children?: ReactNode;
  submit: string;
  className?: string;
  variant?: "primary" | "secondary" | "danger";
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-4 flex items-center gap-3">
        <Button variant={variant} disabled={pending}>{pending ? "Aguarde..." : submit}</Button>
        {state?.error && <span className="text-red-600">{state.error}</span>}
        {state?.ok && <span className="text-emerald-700">{state.ok}</span>}
      </div>
    </form>
  );
}

/** Botão que chama uma server action simples, com confirmação opcional. */
export function ConfirmButton({ action, children, confirm, variant = "secondary", className }: { action: () => Promise<unknown>; children: ReactNode; confirm?: string; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string }) {
  return (
    <form
      action={async () => {
        await action();
      }}
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      <Button variant={variant} className={className}>{children}</Button>
    </form>
  );
}
