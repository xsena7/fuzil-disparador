"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { saveAvatarAction } from "@/app/actions/funnels";
import { Button } from "@/components/ui";

/** Foto que aparece no perfil do WhatsApp do celular de exemplo da landing. */
export function AvatarUpload({ funnelId, avatar, company }: { funnelId: string; avatar?: string; company: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const router = useRouter();
  const send = (form: FormData) =>
    start(async () => {
      setError("");
      const res = await saveAvatarAction(funnelId, form);
      if (res.ok) router.refresh();
      else setError(res.error ?? "Não deu para salvar");
    });

  return (
    <div className="flex flex-wrap items-center gap-4">
      {avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatar} alt="" className="size-16 rounded-full object-cover ring-1 ring-zinc-200" />
      ) : (
        <span className="flex size-16 items-center justify-center rounded-full bg-zinc-800 text-xl font-bold text-white">{company.charAt(0)}</span>
      )}
      <div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={() => input.current?.click()}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <ImagePlus className="size-4" />} {avatar ? "Trocar foto" : "Escolher foto"}
          </Button>
          {avatar && (
            <Button
              type="button"
              variant="ghost"
              disabled={pending}
              onClick={() => {
                const f = new FormData();
                f.set("remove", "1");
                send(f);
              }}
            >
              <Trash2 className="size-4" /> Tirar
            </Button>
          )}
        </div>
        <p className="mt-1.5 text-xs text-zinc-500">JPG ou PNG quadrada, até 5 MB. Sem foto, aparece a primeira letra da empresa.</p>
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          const f = new FormData();
          f.set("file", file);
          send(f);
          e.target.value = "";
        }}
      />
    </div>
  );
}
