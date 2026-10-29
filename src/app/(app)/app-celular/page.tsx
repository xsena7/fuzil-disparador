import { Smartphone } from "lucide-react";
import { requireAuth } from "@/lib/auth";
import { env } from "@/lib/env";
import { InstallGuide } from "./install-guide";

export const metadata = { title: "App Celular · Fuzil Disparador" };

export default async function AppCelularPage() {
  await requireAuth();
  return (
    <div className="mx-auto max-w-3xl">
      <div className="relative mb-6 overflow-hidden rounded-3xl bg-ink p-7 text-white">
        <div className="pointer-events-none absolute -right-20 -top-24 size-80 rounded-full bg-orange-500/25 blur-3xl" />
        <div className="relative flex items-center gap-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/pwa/icon-192.png" alt="Ícone do Fuzil" className="size-20 shrink-0 rounded-[22px] shadow-lg shadow-orange-500/30" />
          <div>
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-orange-200"><Smartphone className="size-3.5" /> App Celular</div>
            <h1 className="text-2xl font-semibold tracking-tight">Fuzil na tela do seu celular</h1>
            <p className="mt-1 text-zinc-300">Instale em 3 toques: fica com o ícone do Fuzil, abre em tela cheia e você acompanha campanhas, chat e alertas de qualquer lugar. Não precisa baixar nada da loja.</p>
          </div>
        </div>
      </div>
      <InstallGuide url={env.appUrl()} />
    </div>
  );
}
