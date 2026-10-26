"use client";

import { useActionState, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { ImagePlus, Loader2, UserRound } from "lucide-react";
import { getProfileAction, saveProfileAction } from "@/app/actions/profile";
import type { BusinessProfile } from "@/lib/meta";
import { Button, Field, Input, Textarea } from "@/components/ui";
import { toastResult } from "@/components/toast";

// Ramos que a Meta aceita (aparece no perfil como "categoria")
const VERTICALS: Array<[string, string]> = [
  ["", "Não mudar"],
  ["OTHER", "Outro"],
  ["PROF_SERVICES", "Serviços profissionais"],
  ["RETAIL", "Loja / varejo"],
  ["APPAREL", "Roupas e acessórios"],
  ["BEAUTY", "Beleza, spa e salão"],
  ["EDU", "Educação"],
  ["FINANCE", "Finanças e bancos"],
  ["HEALTH", "Saúde"],
  ["AUTO", "Automotivo"],
  ["GROCERY", "Mercado"],
  ["RESTAURANT", "Restaurante"],
  ["HOTEL", "Hotel e hospedagem"],
  ["TRAVEL", "Viagem e turismo"],
  ["EVENT_PLAN", "Eventos"],
  ["ENTERTAIN", "Entretenimento"],
  ["NONPROFIT", "Sem fins lucrativos"],
  ["GOVT", "Governo"],
];

/** "Perfil do WhatsApp" de um número: foto, recado, descrição, site... e aplicar em vários números de uma vez. */
export function ProfileEditor({ phoneId, bmName }: { phoneId: string; bmName: string }) {
  const [open, setOpen] = useState(false);
  const [profile, setProfile] = useState<BusinessProfile | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scope, setScope] = useState<"phone" | "bm" | "all">("phone");
  const [state, action, pending] = useActionState(saveProfileAction.bind(null, phoneId), undefined);
  const router = useRouter();

  useEffect(() => {
    if (!open || profile || loadError) return;
    getProfileAction(phoneId).then((r) => (r.error ? setLoadError(r.error) : setProfile(r.profile ?? {})));
  }, [open, profile, loadError, phoneId]);
  useEffect(() => {
    toastResult(state);
    if (state?.ok) {
      setProfile(null); // recarrega com a foto nova
      router.refresh();
    }
  }, [state, router]);

  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
        <UserRound className="size-4" /> Perfil do WhatsApp
      </button>
    );

  const many = scope !== "phone";
  const photoUrl = preview ?? profile?.profile_picture_url ?? null;
  return (
    <div className="w-full rounded-xl bg-zinc-50 p-4 ring-1 ring-zinc-200">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="font-semibold text-zinc-900">Perfil do WhatsApp</div>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-zinc-500 hover:text-zinc-800">Fechar</button>
      </div>
      {loadError && <p className="mb-3 text-sm text-red-600">Não deu para ler o perfil atual: {loadError}</p>}
      {!profile && !loadError ? (
        <div className="flex items-center gap-2 py-4 text-sm text-zinc-500"><Loader2 className="size-4 animate-spin" /> Buscando o perfil na Meta...</div>
      ) : (
        <form action={action} key={`${scope}-${JSON.stringify(profile)}`} className="space-y-4">
          <input type="hidden" name="scope" value={scope} />
          <div className="flex flex-wrap items-center gap-4">
            <label className="group relative flex size-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-white ring-1 ring-zinc-200 hover:ring-orange-300">
              {photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl} alt="Foto do perfil" className="size-full object-cover" />
              ) : (
                <ImagePlus className="size-6 text-zinc-400" />
              )}
              <span className="absolute inset-x-0 bottom-0 bg-black/50 py-0.5 text-center text-[10px] font-medium text-white opacity-0 transition group-hover:opacity-100">Trocar</span>
              <input
                type="file"
                name="photo"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  setPreview(f ? URL.createObjectURL(f) : null);
                }}
              />
            </label>
            <p className="max-w-sm text-xs text-zinc-500">Clique na bolinha para escolher a foto (JPG ou PNG, quadrada, de preferência 640×640, até 5 MB).</p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Field label="Recado" hint="Aparece embaixo do nome (até 139 letras)">
              <Input name="about" defaultValue={many ? "" : (profile?.about ?? "")} maxLength={139} placeholder={many ? "Vazio = não mudar" : "Ex.: Atendimento de seg a sex, 8h às 18h"} />
            </Field>
            <Field label="Categoria">
              <select name="vertical" defaultValue={many ? "" : (profile?.vertical ?? "")} className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm">
                {VERTICALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Descrição" hint="Até 512 letras">
              <Textarea name="description" rows={3} defaultValue={many ? "" : (profile?.description ?? "")} maxLength={512} placeholder={many ? "Vazio = não mudar" : ""} />
            </Field>
            <div className="space-y-3">
              <Field label="Site">
                <Input name="website" defaultValue={many ? "" : (profile?.websites?.[0] ?? "")} placeholder="https://seusite.com.br" maxLength={256} />
              </Field>
              <Field label="E-mail">
                <Input name="email" type="email" defaultValue={many ? "" : (profile?.email ?? "")} maxLength={128} placeholder={many ? "Vazio = não mudar" : ""} />
              </Field>
            </div>
            <Field label="Endereço">
              <Input name="address" defaultValue={many ? "" : (profile?.address ?? "")} maxLength={256} placeholder={many ? "Vazio = não mudar" : ""} />
            </Field>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="font-medium text-zinc-700">Aplicar em:</span>
            {([
              ["phone", "Só este número"],
              ["bm", `Todos os números da ${bmName}`],
              ["all", "Todos os números da conta"],
            ] as const).map(([v, l]) => (
              <button key={v} type="button" onClick={() => { setScope(v); setPreview(null); }} className={clsx("rounded-full px-3.5 py-1.5 font-medium transition", scope === v ? "bg-zinc-900 text-white" : "bg-white text-zinc-700 ring-1 ring-zinc-200 hover:bg-zinc-100")}>
                {l}
              </button>
            ))}
          </div>
          {many && <p className="text-xs text-zinc-500">Em vários números, só o que você preencher (e a foto, se escolher) é trocado. O resto do perfil de cada número fica como está.</p>}
          <div className="flex items-center gap-3">
            <Button disabled={pending}>{pending ? "Salvando na Meta..." : "Salvar perfil"}</Button>
            {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
          </div>
        </form>
      )}
    </div>
  );
}
