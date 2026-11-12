"use client";

// Foto de perfil do número (link da Meta). O link vence com o tempo: se não carregar, mostra o ícone em vez da imagem quebrada.
import { useState } from "react";
import { ImageOff } from "lucide-react";

export function PhotoAvatar({ url }: { url: string | null }) {
  const [broken, setBroken] = useState(false);
  if (url && !broken)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className="size-8 shrink-0 rounded-full object-cover ring-1 ring-zinc-200" />;
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-zinc-100 text-zinc-400" title={url ? "A foto ainda está carregando na Meta" : "Sem foto de perfil"}>
      <ImageOff className="size-3.5" />
    </span>
  );
}
