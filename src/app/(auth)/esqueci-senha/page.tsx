"use client";

import Link from "next/link";
import { useActionState } from "react";
import { forgotPasswordAction } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

export default function ForgotPasswordPage() {
  const [state, action, pending] = useActionState(forgotPasswordAction, undefined);
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Esqueci minha senha</h1>
      <p className="mb-7 mt-1.5 text-zinc-500">Digite seu e-mail e enviamos um link para criar uma nova senha.</p>
      {state?.ok ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{state.ok}</p>
      ) : (
        <form action={action} className="space-y-4">
          <Field label="E-mail"><Input name="email" type="email" required autoFocus /></Field>
          <Button className="w-full py-2.5" disabled={pending}>{pending ? "Enviando..." : "Enviar link"}</Button>
        </form>
      )}
      <p className="mt-6 text-center text-sm text-zinc-500"><Link href="/login" className="font-medium text-brand-600 hover:underline">Voltar para o login</Link></p>
    </div>
  );
}
