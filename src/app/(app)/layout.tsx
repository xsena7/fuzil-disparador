import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { AlertToaster } from "@/components/alert-toaster";
import { backToMyWorkspaceAction } from "@/app/actions/misc";
import { Eye } from "lucide-react";
import { CursorGlow } from "@/components/cursor-glow";
import { BugReportButton } from "@/components/bug-report";
import { Toaster } from "@/components/toast";
import { Logo } from "@/components/brand";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();
  const [unread, chatUnread] = await Promise.all([
    prisma.alert.count({ where: { workspaceId: auth.workspace.id, readAt: null, severity: { not: "INFO" } } }),
    prisma.conversation.count({ where: { workspaceId: auth.workspace.id, unread: { gt: 0 } } }),
  ]);
  return (
    <div className="flex min-h-screen">
      <Sidebar workspace={auth.workspace.name} user={auth.user.email} unread={unread} chatUnread={chatUnread} balance={auth.workspace.creditBalance} isSuperAdmin={auth.user.isSuperAdmin} />
      {/* Fundo de todas as telas: brilho laranja bem clarinho e a logo do Fuzil apagada (só enfeite) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -top-40 right-[-10%] size-[620px] rounded-full bg-orange-400/[.13] blur-[130px]" />
        <div className="absolute left-[18%] top-[45%] size-[520px] rounded-full bg-orange-300/[.12] blur-[130px]" />
        <div className="absolute -bottom-40 right-[20%] size-[480px] rounded-full bg-rose-400/[.08] blur-[130px]" />
        <Logo className="absolute bottom-10 right-8 w-[min(640px,60vw)] opacity-[.045]" />
      </div>
      <main className="relative z-[1] min-w-0 flex-1 px-4 pb-8 pt-20 md:px-10 md:py-9">
        {auth.inspecting && (
          <form action={backToMyWorkspaceAction} className="-mx-4 -mt-6 mb-6 flex flex-wrap items-center gap-3 bg-brand-gradient px-4 py-2.5 text-sm text-white md:-mx-10 md:-mt-9 md:mb-8 md:px-10">
            <Eye className="size-4" />
            <span className="flex-1">Você está vendo a conta <b>{auth.workspace.name}</b> como admin da plataforma.</span>
            <button className="rounded-lg bg-white/20 px-3 py-1 font-medium hover:bg-white/30">Voltar para a minha conta</button>
          </form>
        )}
        {children}
      </main>
      <AlertToaster />
      <Toaster />
      <CursorGlow />
      <BugReportButton />
    </div>
  );
}
