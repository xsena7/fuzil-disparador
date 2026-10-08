import Link from "next/link";
import { findValidToken } from "@/lib/password-tokens";
import { SetPasswordForm } from "./form";

export const dynamic = "force-dynamic";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  const t = await findValidToken(token);
  if (!t) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Link expirado</h1>
        <p className="mb-6 mt-1.5 text-zinc-500">Esse link não é mais válido. Peça um novo para redefinir a senha.</p>
        <Link href="/esqueci-senha" className="font-medium text-brand-600 hover:underline">Pedir novo link</Link>
      </div>
    );
  }
  const invite = t.purpose === "INVITE";
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{invite ? `Bem-vindo, ${t.user.name.split(" ")[0]}!` : "Nova senha"}</h1>
      <p className="mb-7 mt-1.5 text-zinc-500">{invite ? "Crie sua senha para acessar o Fuzil Disparador." : "Escolha uma nova senha para sua conta."}</p>
      <SetPasswordForm token={token} email={t.user.email} />
    </div>
  );
}
