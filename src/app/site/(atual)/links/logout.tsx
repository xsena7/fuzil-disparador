"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { logoutLinksAction } from "@/app/actions/links";

export function LogoutButton() {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button type="button" disabled={pending} onClick={() => start(async () => { await logoutLinksAction(); router.refresh(); })} className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3 py-2 text-sm text-zinc-200 hover:bg-white/20">
      <LogOut className="size-4" /> Sair
    </button>
  );
}
