"use client";

import { useRef, useState, useTransition } from "react";
import { usePathname } from "next/navigation";
import { ImagePlus, X } from "lucide-react";
import { reportBugAction } from "@/app/actions/bugs";
import { Button, Textarea } from "./ui";
import { PixelBug } from "./pixel-bug";

/** Botão flutuante do bichinho (canto inferior direito) para o cliente reportar um bug. */
export function BugReportButton() {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [shot, setShot] = useState<File | null>(null);
  const [pending, start] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const path = usePathname();

  const close = () => {
    setOpen(false);
    setDone(null);
    setError(null);
    setShot(null);
  };

  const submit = (form: FormData) => {
    form.set("pagePath", path);
    form.set("userAgent", `${navigator.userAgent} · tela ${window.innerWidth}x${window.innerHeight}`);
    if (shot) form.set("screenshot", shot);
    setError(null);
    start(async () => {
      const r = await reportBugAction(form);
      if (r.error) setError(r.error);
      else setDone(r.ok ?? "Recebido!");
    });
  };

  // Colar um print direto (Ctrl+V) dentro da caixa
  const onPaste = (e: React.ClipboardEvent) => {
    const img = [...e.clipboardData.files].find((f) => f.type.startsWith("image/"));
    if (img) setShot(img);
  };

  return (
    <>
      {!open && <button
        onClick={() => setOpen(true)}
        className="group fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-2xl bg-white p-2 shadow-lift ring-1 ring-zinc-200 transition hover:-translate-y-0.5 hover:ring-brand-300"
        aria-label="Reportar bug"
        title="Reportar bug"
      >
        <PixelBug className="size-9 transition group-hover:rotate-[-8deg]" />
        <span className="max-w-0 overflow-hidden whitespace-nowrap pr-0 text-sm font-medium text-zinc-700 transition-all duration-300 group-hover:max-w-32 group-hover:pr-2">Reportar bug</span>
      </button>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-end bg-zinc-950/30 p-5 sm:items-end" onMouseDown={close}>
          <div className="animate-fade-up w-full max-w-md rounded-2xl bg-white p-6 shadow-lift" onMouseDown={(e) => e.stopPropagation()} onPaste={onPaste}>
            <div className="mb-4 flex items-start gap-3">
              <PixelBug className="size-10 shrink-0" />
              <div className="flex-1">
                <div className="text-lg font-semibold">Reportar bug</div>
                <div className="text-sm text-zinc-500">Achou algo quebrado ou estranho? Conta pra gente.</div>
              </div>
              <button onClick={close} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Fechar"><X className="size-4" /></button>
            </div>

            {done ? (
              <div className="space-y-4">
                <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{done}</p>
                <Button className="w-full" onClick={close}>Fechar</Button>
              </div>
            ) : (
              <form action={submit} className="space-y-3">
                <Textarea
                  name="message"
                  rows={5}
                  required
                  autoFocus
                  placeholder={"O que aconteceu? O que você estava tentando fazer?\nEx.: cliquei em Iniciar na campanha e apareceu erro."}
                />
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => setShot(e.target.files?.[0] ?? null)} />
                {shot ? (
                  <div className="flex items-center gap-2 rounded-lg bg-zinc-50 px-3 py-2 text-sm">
                    <ImagePlus className="size-4 text-brand-500" />
                    <span className="flex-1 truncate">{shot.name || "print colado"}</span>
                    <button type="button" onClick={() => setShot(null)} className="text-xs text-zinc-500 hover:text-rose-600">remover</button>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()} className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 px-3 py-2.5 text-sm text-zinc-500 hover:border-brand-300 hover:text-zinc-700">
                    <ImagePlus className="size-4" /> Anexar print (ou cole com Ctrl+V)
                  </button>
                )}
                <p className="text-xs text-zinc-400">A página em que você está e o navegador vão junto automaticamente.</p>
                {error && <p className="text-sm text-rose-600">{error}</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button type="button" variant="ghost" onClick={close}>Cancelar</Button>
                  <Button disabled={pending}>{pending ? "Enviando..." : "Enviar"}</Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
}
