import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { AlertToaster } from "@/components/alert-toaster";
import { backToMyWorkspaceAction } from "@/app/actions/misc";
import { Eye } from "lucide-react";
import { CursorGlow } from "@/components/cursor-glow";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();
  const unread = await prisma.alert.count({ where: { workspaceId: auth.workspace.id, readAt: null, severity: { not: "INFO" } } });
  return (
    <div className="flex min-h-screen">
      <Sidebar workspace={auth.workspace.name} user={auth.user.email} unread={unread} balance={auth.workspace.creditBalance} isSuperAdmin={auth.user.isSuperAdmin} />
      <main className="min-w-0 flex-1 px-10 py-9">
        {auth.inspecting && (
          <form action={backToMyWorkspaceAction} className="-mx-10 -mt-9 mb-8 flex items-center gap-3 bg-brand-gradient px-10 py-2.5 text-sm text-white">
            <Eye className="size-4" />
            <span className="flex-1">Você está vendo a conta <b>{auth.workspace.name}</b> como admin da plataforma.</span>
            <button className="rounded-lg bg-white/20 px-3 py-1 font-medium hover:bg-white/30">Voltar para a minha conta</button>
          </form>
        )}
        {children}
      </main>
      <AlertToaster />
      <CursorGlow />
    </div>
  );
}
