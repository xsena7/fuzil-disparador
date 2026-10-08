"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Copy, FolderInput, FolderMinus, FolderPlus, MoreVertical, Trash2 } from "lucide-react";
import {
  createFolderAndMoveAction,
  moveCampaignAction,
  quickDeleteCampaignAction,
  quickDuplicateCampaignAction,
} from "@/app/actions/campaigns";

/** Menu ⋮ de cada campanha na lista: mover para pasta, duplicar, excluir. */
export function CampaignRowMenu({
  id,
  name,
  running,
  folderId,
  folders,
}: {
  id: string;
  name: string;
  running: boolean;
  folderId: string | null;
  folders: Array<{ id: string; name: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const run = (fn: () => Promise<unknown>) => {
    setOpen(false);
    start(async () => {
      await fn();
      router.refresh();
    });
  };

  const item = "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm hover:bg-zinc-100 disabled:opacity-40 disabled:hover:bg-transparent";

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx("rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700", pending && "animate-pulse")}
        aria-label="Ações da campanha"
      >
        <MoreVertical className="size-4" />
      </button>
      {open && (
        <div className="animate-fade-up absolute right-0 top-9 z-20 w-60 rounded-xl border border-zinc-200 bg-white p-1.5 shadow-lift">
          <div className="px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wide text-zinc-400">Mover para pasta</div>
          {folders.filter((f) => f.id !== folderId).map((f) => (
            <button key={f.id} className={item} onClick={() => run(() => moveCampaignAction(id, f.id))}>
              <FolderInput className="size-4 text-zinc-400" /> {f.name}
            </button>
          ))}
          <button
            className={item}
            onClick={() => {
              const n = window.prompt("Nome da nova pasta (ex.: Outubro, Felipe, Testes):");
              if (n?.trim()) run(() => createFolderAndMoveAction(id, n));
            }}
          >
            <FolderPlus className="size-4 text-brand-500" /> Nova pasta…
          </button>
          {folderId && (
            <button className={item} onClick={() => run(() => moveCampaignAction(id, null))}>
              <FolderMinus className="size-4 text-zinc-400" /> Tirar da pasta
            </button>
          )}
          <div className="my-1 h-px bg-zinc-100" />
          <button className={item} onClick={() => run(() => quickDuplicateCampaignAction(id))}>
            <Copy className="size-4 text-zinc-400" /> Duplicar
          </button>
          <button
            className={clsx(item, "text-rose-600 hover:bg-rose-50")}
            disabled={running}
            title={running ? "Pause ou cancele antes de excluir" : undefined}
            onClick={() => {
              if (window.confirm(`Excluir a campanha "${name}" e todo o relatório? Não dá pra desfazer.`)) {
                run(async () => {
                  const r = await quickDeleteCampaignAction(id);
                  if (r.error) window.alert(r.error);
                });
              }
            }}
          >
            <Trash2 className="size-4" /> Excluir
          </button>
        </div>
      )}
    </div>
  );
}

/** Ações da pasta (renomear / desfazer pasta). */
export function FolderMenu({ id, name, onRename, onDelete }: { id: string; name: string; onRename: (id: string, name: string) => Promise<unknown>; onDelete: (id: string) => Promise<unknown> }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <span className={clsx("flex items-center gap-1", pending && "opacity-50")} onClick={(e) => e.preventDefault()}>
      <button
        className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800"
        onClick={() => {
          const n = window.prompt("Novo nome da pasta:", name);
          if (n?.trim()) start(async () => { await onRename(id, n); router.refresh(); });
        }}
      >
        Renomear
      </button>
      <button
        className="rounded-lg px-2 py-1 text-xs text-zinc-500 hover:bg-rose-50 hover:text-rose-600"
        onClick={() => {
          if (window.confirm(`Desfazer a pasta "${name}"? As campanhas voltam para a lista principal (nada é excluído).`)) start(async () => { await onDelete(id); router.refresh(); });
        }}
      >
        Desfazer pasta
      </button>
    </span>
  );
}
