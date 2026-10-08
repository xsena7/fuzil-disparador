import { CheckCircle2 } from "lucide-react";
import { Logo } from "@/components/brand";
import { CursorGlow } from "@/components/cursor-glow";

const points = [
  "Disparo distribuído entre vários números e BMs",
  "Trava anti-marketing: só templates de utilidade",
  "Cliques, leituras e respostas em tempo real",
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-ink p-12 lg:flex lg:flex-col lg:justify-between">
        <div className="pointer-events-none absolute -left-40 -top-40 size-[520px] rounded-full bg-orange-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-48 -right-32 size-[520px] rounded-full bg-rose-600/20 blur-3xl" />
        <div />
        <div className="relative">
          <Logo className="w-full max-w-lg" />
          <ul className="mt-10 space-y-3">
            {points.map((p) => (
              <li key={p} className="flex items-center gap-3 text-zinc-300">
                <CheckCircle2 className="size-5 text-brand-400" /> {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs text-zinc-600">API oficial do WhatsApp · Meta Cloud API</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8 rounded-2xl bg-ink p-5 lg:hidden">
            <Logo className="w-full" />
          </div>
          {children}
        </div>
      </div>
      <CursorGlow />
    </div>
  );
}
