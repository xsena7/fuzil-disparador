"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { ImageOff } from "lucide-react";

export type PhotoUrls = { female: string; male: string };

const OPTIONS = [
  { value: "female", label: "Mulher" },
  { value: "male", label: "Homem" },
  { value: "", label: "Sem foto" },
] as const;

/** Escolhe a foto de perfil do número novo (mulher, homem ou nenhuma). A última escolha fica lembrada. */
export function PhotoPick({ name, photos, compact = false }: { name: string; photos: PhotoUrls; compact?: boolean }) {
  const [value, setValue] = useState<string>("female");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("keep:foto-perfil");
      if (saved !== null) setValue(saved);
    } catch {}
  }, []);
  const pick = (v: string) => {
    setValue(v);
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
      </div>
    </div>
  );
}
