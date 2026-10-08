"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Mail, Trash2 } from "lucide-react";
import { adminDeleteUserAction, adminResendInviteAction } from "@/app/actions/misc";

export function UserActions({ id, email, isSelf }: { id: string; email: string; isSelf: boolean }) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; link?: string; error?: boolean } | null>(null);
  const router = useRouter();
  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40";
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex gap-1.5">
        <button
          className={btn}
          disabled={pending}
          onClick={() => start(async () => {
            const r = await adminResendInviteAction(id);
            setMsg(r.error ? { text: r.error, error: true } : { text: r.ok!, link: r.link });
          })}
        >
          <Mail className="size-3.5" /> Reenviar convite
        </button>
        <button
          className={`${btn} text-rose-600 hover:bg-rose-50`}
          disabled={pending || isSelf}
          title={isSelf ? "Você não pode excluir a si mesmo" : undefined}
          onClick={() => {
            if (!window.confirm(`Excluir o usuário ${email}? A conta (cliente) e as campanhas dela continuam existindo.`)) return;
            start(async () => {
              const r = await adminDeleteUserAction(id);
              if (r.error) setMsg({ text: r.error, error: true });
              router.refresh();
            });
          }}
        >
          <Trash2 className="size-3.5" /> Excluir
        </button>
      </div>
      {msg && (
        <div className={`max-w-sm text-right text-xs ${msg.error ? "text-rose-600" : "text-emerald-700"}`}>
          {msg.text}
          {msg.link && (
            <button className="ml-1 inline-flex items-center gap-1 font-medium text-brand-600 hover:underline" onClick={() => navigator.clipboard.writeText(msg.link!)}>
              <Copy className="size-3" /> copiar link
            </button>
          )}
        </div>
      )}
    </div>
  );
}
