"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock } from "lucide-react";
import { forgotLinksAction, loginLinksAction, resetLinksAction, signupLinksAction, type LoginState } from "@/app/actions/links";

const inp = "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-[15px] outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const btn = "flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:opacity-90 disabled:opacity-60";

type Mode = "login" | "signup" | "forgot";

function Field({ label, ...props }: { label: string } & React.ComponentProps<"input">) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium text-zinc-700">{label}</span>
      <input {...props} className={inp} />
    </label>
  );
}

function Msg({ s }: { s: LoginState }) {
  if (s?.error) return <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{s.error}</p>;
  if (s?.ok) return <p className="mb-4 rounded-xl bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700 ring-1 ring-emerald-200">{s.ok}</p>;
  return null;
}

/** Entrar, criar conta ou pedir senha nova (e-mail e senha). */
export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [login, loginAction, logging] = useActionState<LoginState, FormData>(loginLinksAction, undefined);
  const [signup, signupAction, signing] = useActionState<LoginState, FormData>(signupLinksAction, undefined);
  const [forgot, forgotAction, sending] = useActionState<LoginState, FormData>(forgotLinksAction, undefined);

  useEffect(() => {
    if (login?.done || signup?.done) router.refresh();
  }, [login, signup, router]);

  const tab = (m: Mode, label: string) => (
    <button type="button" onClick={() => setMode(m)} className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${mode === m ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800"}`}>
      {label}
    </button>
  );

  return (
    <div className="rounded-3xl bg-white p-6 text-zinc-700 shadow-2xl ring-1 ring-black/5 sm:p-7">
      {mode !== "forgot" && (
        <div className="mb-5 flex gap-1 rounded-xl bg-zinc-100 p-1">
          {tab("login", "Entrar")}
          {tab("signup", "Criar conta")}
        </div>
      )}
      {mode === "login" && (
        <form action={loginAction}>
          <Field label="E-mail" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          <Field label="Senha" name="password" type="password" required autoComplete="current-password" />
          <Msg s={login} />
          <button disabled={logging} className={btn}>{logging && <Loader2 className="size-4 animate-spin" />} Entrar</button>
          <button type="button" onClick={() => setMode("forgot")} className="mt-3 w-full text-center text-sm font-medium text-orange-600 hover:underline">Esqueci minha senha</button>
        </form>
      )}
      {mode === "signup" && (
        <form action={signupAction}>
          <Field label="Seu nome" name="name" required autoComplete="name" placeholder="Ex.: João Silva" />
          <Field label="E-mail" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          <Field label="Senha (mínimo 8 caracteres)" name="password" type="password" required minLength={8} autoComplete="new-password" />
          <Msg s={signup} />
          <button disabled={signing} className={btn}>{signing && <Loader2 className="size-4 animate-spin" />} Criar conta</button>
        </form>
      )}
      {mode === "forgot" && (
        <form action={forgotAction}>
          <h2 className="text-xl font-semibold text-zinc-900">Esqueci minha senha</h2>
          <p className="mb-5 mt-1 text-sm text-zinc-500">Mandamos um link no seu e-mail para criar uma senha nova.</p>
          <Field label="E-mail" name="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          <Msg s={forgot} />
          <button disabled={sending} className={btn}>{sending && <Loader2 className="size-4 animate-spin" />} Mandar link</button>
          <button type="button" onClick={() => setMode("login")} className="mt-3 w-full text-center text-sm font-medium text-orange-600 hover:underline">Voltar para entrar</button>
        </form>
      )}
      <p className="mt-4 flex items-start gap-2 text-xs text-zinc-500"><Lock className="mt-0.5 size-4 shrink-0 text-emerald-600" /> Cada conta vê só os próprios links.</p>
    </div>
  );
}

/** Senha nova pelo link do e-mail. */
export function ResetForm({ token }: { token: string }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<LoginState, FormData>(resetLinksAction, undefined);
  useEffect(() => {
    if (state?.done) router.push("/links");
  }, [state, router]);
  return (
    <form action={action} className="rounded-3xl bg-white p-6 text-zinc-700 shadow-2xl ring-1 ring-black/5 sm:p-7">
      <h2 className="text-xl font-semibold text-zinc-900">Criar senha nova</h2>
      <p className="mb-5 mt-1 text-sm text-zinc-500">Depois de salvar você já entra na sua conta.</p>
      <input type="hidden" name="token" value={token} />
      <Field label="Senha nova (mínimo 8 caracteres)" name="password" type="password" required minLength={8} autoComplete="new-password" />
      <Msg s={state} />
      <button disabled={pending} className={btn}>{pending && <Loader2 className="size-4 animate-spin" />} Salvar senha</button>
    </form>
  );
}
