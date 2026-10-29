"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, Copy, Download, EllipsisVertical, PlusSquare, Share } from "lucide-react";
import { Card } from "@/components/ui";
import { toast } from "@/components/toast";

type Os = "iphone" | "android";
type InstallPrompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };

/** Passo a passo para instalar (iPhone e Android) e o botão "Instalar" quando o navegador deixa instalar direto. */
export function InstallGuide({ url }: { url: string }) {
  const [os, setOs] = useState<Os>("android");
  const [prompt, setPrompt] = useState<InstallPrompt | null>(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) setOs("iphone");
    if (window.matchMedia("(display-mode: standalone)").matches) setInstalled(true);
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPrompt);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const steps =
    os === "iphone"
      ? [
          { icon: Share, text: <>Abra o Fuzil no <b>Safari</b> e toque no botão <b>Compartilhar</b> (o quadrado com a seta para cima, embaixo da tela).</> },
          { icon: PlusSquare, text: <>Role a lista e toque em <b>Adicionar à Tela de Início</b>.</> },
          { icon: CheckCircle2, text: <>Toque em <b>Adicionar</b>, no canto de cima. Pronto: o ícone do Fuzil aparece na tela do celular.</> },
        ]
      : [
          { icon: EllipsisVertical, text: <>Abra o Fuzil no <b>Chrome</b> e toque nos <b>três pontinhos</b> (⋮), no canto de cima.</> },
          { icon: Download, text: <>Toque em <b>Instalar app</b> (ou <b>Adicionar à tela inicial</b>).</> },
          { icon: CheckCircle2, text: <>Confirme em <b>Instalar</b>. Pronto: o ícone do Fuzil aparece na tela do celular.</> },
        ];

  return (
    <div className="space-y-4">
      {installed ? (
        <Card className="flex items-center gap-3 border-emerald-200 bg-emerald-50 p-4 text-emerald-800">
          <CheckCircle2 className="size-5" /> <b>O app já está instalado neste aparelho.</b>
        </Card>
      ) : (
        prompt && (
          <Card className="flex flex-wrap items-center gap-3 p-4">
            <span className="flex-1 font-medium">Seu navegador deixa instalar direto:</span>
            <button
              type="button"
              onClick={async () => {
                await prompt.prompt();
                const r = await prompt.userChoice;
                if (r.outcome === "accepted") setInstalled(true);
                setPrompt(null);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-gradient px-5 py-2.5 font-semibold text-white shadow-md shadow-orange-500/30 hover:brightness-110"
            >
              <Download className="size-4" /> Instalar o app
            </button>
          </Card>
        )
      )}

      <Card className="p-5">
        <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-zinc-100 p-1 text-sm">
          {([["iphone", "iPhone"], ["android", "Android"]] as const).map(([k, l]) => (
            <button key={k} type="button" onClick={() => setOs(k)} className={clsx("rounded-lg py-2 font-semibold transition", os === k ? "bg-white text-zinc-900 shadow-sm" : "text-zinc-500 hover:text-zinc-800")}>
              {l}
            </button>
          ))}
        </div>
        <ol className="space-y-3">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-sm font-bold text-white">{i + 1}</span>
              <span className="flex-1 pt-1 text-[15px] leading-relaxed text-zinc-700">{s.text}</span>
              <s.icon className="mt-1.5 size-5 shrink-0 text-zinc-400" />
            </li>
          ))}
        </ol>
        {os === "iphone" && <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">No iPhone tem que ser pelo <b>Safari</b>: no Chrome do iPhone a opção não aparece.</p>}
      </Card>

      <Card className="p-5">
        <div className="mb-1 font-semibold">Está no computador?</div>
        <p className="mb-3 text-sm text-zinc-600">Abra este endereço no navegador do celular, entre com o seu e-mail e senha e siga os passos acima.</p>
        <div className="flex flex-wrap items-center gap-2">
          <code className="rounded-lg bg-zinc-100 px-3 py-2 text-sm">{url}</code>
          <button
            type="button"
            onClick={async () => {
              await navigator.clipboard.writeText(url).catch(() => undefined);
              toast("success", "Endereço copiado!");
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm font-medium hover:bg-zinc-50"
          >
            <Copy className="size-4" /> Copiar
          </button>
        </div>
        <p className="mt-3 text-xs text-zinc-500">No computador também dá para instalar: no Chrome, clique no ícone de instalar na barra de endereço.</p>
      </Card>
    </div>
  );
}
