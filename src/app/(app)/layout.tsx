import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { AlertToaster } from "@/components/alert-toaster";
import { backToMyWorkspaceAction } from "@/app/actions/misc";
import { Eye } from "lucide-react";
import { CursorGlow } from "@/components/cursor-glow";
import { BugReportButton } from "@/components/bug-report";
import { Toaster } from "@/components/toast";
import { ConfirmHost } from "@/components/confirm-dialog";
import { Logo } from "@/components/brand";
import { Tour } from "@/components/tour";
import { ensureDefaultGroups } from "@/lib/default-groups";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();
  await ensureDefaultGroups(auth.workspace.id).catch(() => undefined);
  const [unread, chatUnread, me, bms] = await Promise.all([
    prisma.alert.count({ where: { workspaceId: auth.workspace.id, readAt: null, severity: { not: "INFO" } } }),
    prisma.conversation.count({ where: { workspaceId: auth.workspace.id, unread: { gt: 0 } } }),
    prisma.user.findUnique({ where: { id: auth.user.id }, select: { tourState: true, financePartner: true } }),
    prisma.businessManager.count({ where: { workspaceId: auth.workspace.id } }),
  ]);
  // Conta nova (sem BM) que ainda não respondeu o convite: pergunta se quer o tour
  const offerTour = !auth.inspecting && !me?.tourState && bms === 0;
  return (
    <div className="flex min-h-screen">
      <Sidebar workspace={auth.workspace.name} user={auth.user.email} unread={unread} chatUnread={chatUnread} balance={auth.workspace.creditBalance} isSuperAdmin={auth.user.isSuperAdmin} financePartner={Boolean(me?.financePartner)} />
      {/* Fundo de todas as telas: brilho laranja bem clarinho e a logo do Fuzil apagada (só enfeite) */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Degradês simples (sem filtro de desfoque, que deixava o mouse pesado) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(620px circle at 88% 0%, rgba(251,146,60,.14), transparent 70%), radial-gradient(520px circle at 32% 62%, rgba(253,186,116,.12), transparent 70%), radial-gradient(480px circle at 72% 100%, rgba(251,113,133,.08), transparent 70%)",
          }}
        />
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
      <ConfirmHost />
      <Tour offer={offerTour} />
      <CursorGlow />
      <BugReportButton />
    </div>
  );
}
