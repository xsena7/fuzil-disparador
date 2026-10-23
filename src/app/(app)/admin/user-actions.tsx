"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { confirmDialog } from "@/components/confirm-dialog";
import { Copy, Mail, Shield, ShieldOff, Trash2 } from "lucide-react";
import { adminDeleteUserAction, adminResendInviteAction, adminSetSuperAdminAction } from "@/app/actions/misc";

export function UserActions({
  id,
  email,
  isSelf,
  canAdmin = false,
  isAdmin = false,
  name = email,
}: {
  id: string;
  email: string;
  isSelf: boolean;
  /** Só o dono do Fuzil vê o botão de dar/tirar administrador */
  canAdmin?: boolean;
  isAdmin?: boolean;
  name?: string;
}) {
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ text: string; link?: string; error?: boolean } | null>(null);
  const router = useRouter();
  const btn = "inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40";
  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap justify-end gap-1.5">
        {canAdmin && (
          <button
            className={isAdmin ? btn : `${btn} border-orange-200 bg-orange-50 text-orange-800 hover:bg-orange-100`}
            disabled={pending}
            onClick={async () => {
              const ask = isAdmin
                ? `Tirar o administrador de ${name}?\nEle deixa de ver o Admin da plataforma e os recursos de administrador.`
                : `Dar administrador do Fuzil para ${name}?\nEle passa a ver o Admin da plataforma, entrar nas contas dos clientes e usar os recursos de administrador (como o funil do gerador de links).`;
              if (!(await confirmDialog(ask))) return;
              start(async () => {
                const r = await adminSetSuperAdminAction(id, !isAdmin);
                setMsg(r.error ? { text: r.error, error: true } : { text: r.ok! });
                router.refresh();
              });
            }}
          >
            {isAdmin ? <ShieldOff className="size-3.5" /> : <Shield className="size-3.5" />} {isAdmin ? "Tirar administrador" : "Dar administrador"}
          </button>
        )}
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
          onClick={async () => {
            if (!(await confirmDialog(`Excluir o usuário ${email}?\nA conta (cliente) e as campanhas dela continuam existindo.`))) return;
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
