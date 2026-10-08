"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "@/app/actions/auth";
import { Button, Card, Field, Input } from "@/components/ui";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signupAction, undefined);
  return (
    <Card className="p-6">
      <form action={action} className="space-y-4">
        <Field label="Seu nome"><Input name="name" required autoFocus /></Field>
        <Field label="Nome da conta" hint="Ex.: nome da sua empresa ou operação"><Input name="company" required /></Field>
        <Field label="E-mail"><Input name="email" type="email" required /></Field>
        <Field label="Senha"><Input name="password" type="password" minLength={8} required /></Field>
        {state?.error && <p className="text-red-600">{state.error}</p>}
        <Button className="w-full" disabled={pending}>{pending ? "Criando..." : "Criar conta"}</Button>
      </form>
      <p className="mt-4 text-center text-zinc-500">
        Já tem conta? <Link href="/login" className="font-medium text-zinc-900 underline">Entrar</Link>
      </p>
    </Card>
  );
}
