"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction } from "@/app/actions/auth";
import { Button, Card, Field, Input } from "@/components/ui";

export default function LoginPage() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <Card className="p-6">
      <form action={action} className="space-y-4">
        <Field label="E-mail"><Input name="email" type="email" required autoFocus /></Field>
        <Field label="Senha"><Input name="password" type="password" required /></Field>
        {state?.error && <p className="text-red-600">{state.error}</p>}
        <Button className="w-full" disabled={pending}>{pending ? "Entrando..." : "Entrar"}</Button>
      </form>
      <p className="mt-4 text-center text-zinc-500">
        Primeiro acesso? <Link href="/cadastro" className="font-medium text-zinc-900 underline">Criar conta</Link>
      </p>
    </Card>
  );
}
