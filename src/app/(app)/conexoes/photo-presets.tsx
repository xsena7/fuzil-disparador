import { RotateCcw } from "lucide-react";
import { ActionForm, ConfirmButton } from "@/components/action-form";
import { Drawer } from "@/components/drawer";
import { resetPhotoPresetAction, savePhotoPresetAction } from "@/app/actions/profile";
import { PHOTO_KINDS, PHOTO_LABEL, photoUrl } from "@/lib/profile-photos";

/** As duas fotos (mulher e homem) que os números novos recebem. Ficam salvas no servidor; dá para trocar. */
export function PhotoPresets({ ws, canEdit }: { ws: { profilePhotoFemale: string | null; profilePhotoMale: string | null }; canEdit: boolean }) {
  return (
    <Drawer title="Fotos de perfil" subtitle="Mulher e homem: escolha ao adicionar o número e ela entra sozinha">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
        {PHOTO_KINDS.map((kind) => {
          const own = Boolean(kind === "female" ? ws.profilePhotoFemale : ws.profilePhotoMale);
          return (
            <div key={kind} className="rounded-xl border border-zinc-200 bg-white p-3">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photoUrl(ws, kind)} alt={PHOTO_LABEL[kind]} className="size-16 rounded-full object-cover ring-1 ring-zinc-200" />
                <div className="min-w-0">
                  <div className="font-semibold">{PHOTO_LABEL[kind]}</div>
                  <div className="text-xs text-zinc-500">{own ? "Foto sua" : "Foto padrão do Fuzil"}</div>
                  {own && canEdit && (
                    <ConfirmButton action={resetPhotoPresetAction.bind(null, kind)} variant="ghost" className="mt-1 px-0 py-0 text-xs text-zinc-500" confirm="Voltar para a foto padrão do Fuzil?">
                      <RotateCcw className="size-3" /> Voltar para a padrão
                    </ConfirmButton>
                  )}
                </div>
              </div>
              {canEdit && (
                <ActionForm action={savePhotoPresetAction.bind(null, kind)} submit="Trocar foto" variant="secondary" className="mt-3 space-y-2">
                  <input type="file" name="photo" accept="image/jpeg,image/png" required className="block w-full text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-xs" />
                </ActionForm>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-3 text-xs text-zinc-500">A foto vira quadrada (640×640) e aparece redonda no WhatsApp. Pode levar alguns minutos para aparecer no celular depois que o número conecta.</p>
    </Drawer>
  );
}
