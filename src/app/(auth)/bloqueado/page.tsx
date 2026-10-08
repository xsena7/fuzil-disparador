import { redirect } from "next/navigation";
import { Lock } from "lucide-react";
import { getAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function BlockedPage() {
  const auth = await getAuth();
  if (!auth) redirect("/login");
  if (!auth.workspace.blocked || auth.user.isSuperAdmin) redirect("/");
  const ws = await prisma.workspace.findUnique({ where: { id: auth.workspace.id }, select: { blockedReason: true } });
  return (
    <div>
      <div className="mb-5 flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600"><Lock className="size-6" /></div>
      <h1 className="text-2xl font-semibold tracking-tight">Conta bloqueada</h1>
      <p className="mb-7 mt-1.5 text-zinc-500">
        A conta <b>{auth.workspace.name}</b> está bloqueada e os disparos estão parados. Fale com o administrador do Fuzil Disparador para liberar.
      </p>
      {ws?.blockedReason && <p className="mb-7 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-600">Motivo: {ws.blockedReason}</p>}
      <form action={logoutAction}>
        <Button variant="secondary" className="w-full py-2.5">Sair</Button>
      </form>
    </div>
  );
}
