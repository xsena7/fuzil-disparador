"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
      <p className="mb-7 mt-1.5 text-zinc-500">Entre para gerenciar suas BMs e disparos.</p>
      <form action={action} className="space-y-4">
        <Field label="E-mail"><Input name="email" type="email" required autoFocus /></Field>
        <Field label="Senha"><Input name="password" type="password" required /></Field>
        {state?.error && <p className="text-red-600">{state.error}</p>}
        <Button className="w-full py-2.5" disabled={pending}>{pending ? "Entrando..." : "Entrar"}</Button>
      </form>
      <p className="mt-4 text-center text-zinc-500">
        Primeiro acesso? <Link href="/cadastro" className="font-medium text-brand-600 hover:underline">Criar conta</Link>
      </p>
    </div>
  );
}
