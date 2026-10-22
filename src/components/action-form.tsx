"use client";

import { useActionState, useEffect, useTransition, type ReactNode } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import type { FormState } from "@/app/actions/auth";
import { Button } from "./ui";
import { toast, toastResult } from "./toast";
import { confirmDialog } from "./confirm-dialog";

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
  const router = useRouter();
  // Atualiza os dados da tela depois de salvar (sem prender o botão em "Aguarde...")
  useEffect(() => {
    if (state?.ok) router.refresh();
    toastResult(state);
  }, [state, router]);
  return (
    <form action={formAction} className={className}>
      {children}
      <div className="mt-4 flex items-center gap-3">
        <Button variant={variant} disabled={pending}>{pending ? "Aguarde..." : submit}</Button>
        {state?.error && <span className="text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

/** Botão que chama uma server action simples, com confirmação opcional. Trava enquanto roda (sem clique duplo) e avisa se der erro. */
export function ConfirmButton({ action, children, confirm, variant = "secondary", className }: { action: () => Promise<unknown>; children: ReactNode; confirm?: string; variant?: "primary" | "secondary" | "danger" | "ghost"; className?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (pending || (confirm && !(await confirmDialog(confirm)))) return;
        start(async () => {
          const r = await action();
          if (r && typeof r === "object" && "error" in r && r.error) toast("error", String(r.error));
          else if (r && typeof r === "object" && "ok" in r) {
            router.refresh();
            toastResult(r, "Feito! A tela já foi atualizada.");
          }
        });
      }}
    >
      <Button variant={variant} className={clsx(className, pending && "opacity-60")} disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        {children}
      </Button>
    </form>
  );
}
