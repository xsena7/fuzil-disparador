"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MessageCircle, ShieldCheck } from "lucide-react";
import { requestLinksCodeAction, resendLinksCodeAction, verifyLinksCodeAction, type LoginState } from "@/app/actions/links";

const inp = "w-full rounded-xl border border-zinc-200 bg-white px-3.5 py-3 text-[15px] outline-none transition focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const btn = "flex w-full items-center justify-center gap-2 rounded-xl bg-brand-gradient px-4 py-3 font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:opacity-90 disabled:opacity-60";
const fmt = (p: string) => p.replace(/^55(\d{2})(\d{4,5})(\d{4})$/, "($1) $2-$3");

/** Login pelo WhatsApp: número (e nome no primeiro acesso) → código → dentro. */
export function LoginForm() {
  const router = useRouter();
  const [req, requestAction, requesting] = useActionState<LoginState, FormData>(requestLinksCodeAction, undefined);
  const [ver, verifyAction, verifying] = useActionState<LoginState, FormData>(verifyLinksCodeAction, undefined);
  const [phone, setPhone] = useState("");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [back, setBack] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resending, startResend] = useTransition();

  useEffect(() => { if (ver?.ok) router.refresh(); }, [ver, router]);
  useEffect(() => { setBack(false); setResendMsg(null); }, [req]);

  const step = back ? "phone" : ver?.step === "code" || req?.step === "code" ? "code" : req?.step === "name" ? "name" : "phone";
  const target = ver?.phone ?? req?.phone ?? "";

  return (
    <div className="rounded-3xl bg-white p-6 text-zinc-700 shadow-2xl ring-1 ring-black/5 sm:p-7">
      {step === "code" ? (
        <form action={verifyAction}>
          <input type="hidden" name="phone" value={target} />
          <button type="button" onClick={() => setBack(true)} className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800"><ArrowLeft className="size-4" /> Trocar número</button>
          <div className="mb-1 flex items-center gap-2 text-sm font-semibold text-emerald-600"><MessageCircle className="size-4" /> Código enviado</div>
          <h2 className="text-xl font-semibold text-zinc-900">Confira seu WhatsApp</h2>
          <p className="mb-5 mt-1 text-sm text-zinc-500">Mandamos um código de 6 números para <b className="text-zinc-800">{fmt(target)}</b>.</p>
          <input
            name="code"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            placeholder="000000"
            className={`${inp} text-center font-mono text-2xl tracking-[.5em]`}
          />
          {ver?.error && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{ver.error}</p>}
          {resendMsg && <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2.5 text-sm text-zinc-600 ring-1 ring-zinc-200">{resendMsg}</p>}
          <button disabled={verifying || code.length !== 6} className={`${btn} mt-4`}>{verifying && <Loader2 className="size-4 animate-spin" />} Entrar</button>
          <button
            type="button"
            disabled={resending}
            onClick={() => startResend(async () => { const r = await resendLinksCodeAction(target); setResendMsg(r.error ?? "Mandamos um código novo. Confira o WhatsApp."); })}
            className="mt-3 w-full text-center text-sm font-medium text-orange-600 hover:underline disabled:opacity-50"
          >
            Mandar outro código
          </button>
        </form>
      ) : (
        <form action={requestAction}>
          <h2 className="text-xl font-semibold text-zinc-900">{step === "name" ? "Primeiro acesso" : "Entrar"}</h2>
          <p className="mb-5 mt-1 text-sm text-zinc-500">{step === "name" ? "Como podemos te chamar? É só desta vez." : "Sem senha: você entra com um código no WhatsApp."}</p>
          <label className="mb-4 block">
            <span className="mb-1.5 block text-sm font-medium text-zinc-700">Seu WhatsApp</span>
            <input name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="(11) 99999-8888" className={inp} />
          </label>
          {step === "name" && (
            <label className="mb-4 block">
              <span className="mb-1.5 block text-sm font-medium text-zinc-700">Seu nome</span>
              <input name="name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Ex.: João Silva" className={inp} />
            </label>
          )}
          {req?.error && <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm text-rose-700 ring-1 ring-rose-200">{req.error}</p>}
          <button disabled={requesting} className={btn}>{requesting && <Loader2 className="size-4 animate-spin" />} Receber código no WhatsApp</button>
          <p className="mt-4 flex items-start gap-2 text-xs text-zinc-500"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" /> A cada acesso você recebe um aviso no WhatsApp. Se não foi você, toque em &quot;Não fui eu&quot; e desconectamos tudo.</p>
        </form>
      )}
    </div>
  );
}
