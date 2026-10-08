"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signupAction } from "@/app/actions/auth";
import { Button, Field, Input } from "@/components/ui";
import { PasswordInput } from "@/components/password-input";

export default function SignupPage() {
  const [state, action, pending] = useActionState(signupAction, undefined);
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Criar conta</h1>
      <p className="mb-7 mt-1.5 text-zinc-500">Configure sua operação em poucos minutos.</p>
      <form action={action} className="space-y-4">
        <Field label="Seu nome"><Input name="name" required autoFocus /></Field>
        <Field label="Nome da conta" hint="Ex.: nome da sua empresa ou operação"><Input name="company" required /></Field>
        <Field label="E-mail"><Input name="email" type="email" required /></Field>
        <Field label="Senha"><PasswordInput name="password" minLength={8} required /></Field>
        {state?.error && <p className="text-red-600">{state.error}</p>}
        <Button className="w-full py-2.5" disabled={pending}>{pending ? "Criando..." : "Criar conta"}</Button>
      </form>
      <p className="mt-4 text-center text-zinc-500">
        Já tem conta? <Link href="/login" className="font-medium text-brand-600 hover:underline">Entrar</Link>
      </p>
    </div>
  );
}
