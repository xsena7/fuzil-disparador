"use client";

import { useActionState } from "react";
import { setPasswordAction } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

export function SetPasswordForm({ token, email }: { token: string; email: string }) {
  const [state, action, pending] = useActionState(setPasswordAction, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <Field label="E-mail"><Input value={email} disabled /></Field>
      <Field label="Senha" hint="Mínimo de 8 caracteres"><Input name="password" type="password" minLength={8} required autoFocus /></Field>
      <Field label="Confirmar senha"><Input name="confirm" type="password" minLength={8} required /></Field>
      {state?.error && <p className="text-sm text-rose-600">{state.error}</p>}
      <Button className="w-full py-2.5" disabled={pending}>{pending ? "Salvando..." : "Salvar e entrar"}</Button>
    </form>
  );
}
