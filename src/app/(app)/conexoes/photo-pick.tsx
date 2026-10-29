"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ImagePlus, ImageOff } from "lucide-react";

export type PhotoUrls = { female: string; male: string };

const OPTIONS = [
  { value: "female", label: "Mulher" },
  { value: "male", label: "Homem" },
  { value: "", label: "Sem foto" },
] as const;

/**
 * Escolhe a foto de perfil do número novo (mulher, homem, nenhuma ou, com allowCustom, uma foto própria).
 * A última escolha (mulher, homem ou nenhuma) fica lembrada. A foto própria vai no campo `${name}File`.
 */
export function PhotoPick({ name, photos, compact = false, allowCustom = false }: { name: string; photos: PhotoUrls; compact?: boolean; allowCustom?: boolean }) {
  const [value, setValue] = useState<string>("female");
  const [preview, setPreview] = useState<string | null>(null);
  useEffect(() => {
    try {
      const saved = localStorage.getItem("keep:foto-perfil");
      if (saved !== null && saved !== "custom") setValue(saved);
    } catch {}
  }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  const pick = (v: string) => {
    setValue(v);
    // A foto própria é de um número só: não fica lembrada
    if (v === "custom") return;
    try {
      localStorage.setItem("keep:foto-perfil", v);
    } catch {}
  };
  const size = compact ? "size-9" : "size-11";
  return (
    <div>
      <span className="mb-1 block text-xs text-zinc-500">Foto de perfil (entra sozinha quando o número conectar)</span>
      <input type="hidden" name={name} value={value} />
      <div className="flex flex-wrap gap-2">
        {OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => pick(o.value)}
            className={clsx(
              "flex items-center gap-2 rounded-xl border bg-white py-1 pl-1 pr-3 text-sm transition",
              value === o.value ? "border-orange-400 ring-2 ring-orange-200" : "border-zinc-200 hover:border-zinc-300",
            )}
          >
            {o.value ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photos[o.value]} alt="" className={clsx(size, "rounded-full object-cover")} />
            ) : (
              <span className={clsx(size, "grid place-items-center rounded-full bg-zinc-100 text-zinc-400")}>
                <ImageOff className="size-4" />
              </span>
            )}
            <span className="font-medium">{o.label}</span>
          </button>
        ))}
        {allowCustom && (
          <button
            type="button"
            onClick={() => pick("custom")}
            className={clsx(
              "flex items-center gap-2 rounded-xl border bg-white py-1 pl-1 pr-3 text-sm transition",
              value === "custom" ? "border-orange-400 ring-2 ring-orange-200" : "border-zinc-200 hover:border-zinc-300",
            )}
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className={clsx(size, "rounded-full object-cover")} />
            ) : (
              <span className={clsx(size, "grid place-items-center rounded-full bg-orange-50 text-orange-500")}>
                <ImagePlus className="size-4" />
              </span>
            )}
            <span className="font-medium">Outra foto</span>
          </button>
        )}
      </div>
      {allowCustom && value === "custom" && (
        <input
          type="file"
          name={`${name}File`}
          accept="image/jpeg,image/png"
          required
          onChange={(e) => {
            const f = e.target.files?.[0];
            setPreview(f ? URL.createObjectURL(f) : null);
          }}
          className="mt-2 block text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-zinc-100 file:px-2 file:py-1 file:text-xs"
        />
      )}
    </div>
  );
}
