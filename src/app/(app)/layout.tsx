import { requireAuth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { Sidebar } from "@/components/sidebar";
import { AlertToaster } from "@/components/alert-toaster";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const auth = await requireAuth();
  const unread = await prisma.alert.count({ where: { workspaceId: auth.workspace.id, readAt: null, severity: { not: "INFO" } } });
  return (
    <div className="flex min-h-screen">
      <Sidebar workspace={auth.workspace.name} user={auth.user.email} unread={unread} balance={auth.workspace.creditBalance} isSuperAdmin={auth.user.isSuperAdmin} />
      <main className="min-w-0 flex-1 px-10 py-9">{children}</main>
      <AlertToaster />
    </div>
  );
}
