"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { resendCodeAction, signupAction, verifyCodeAction } from "@/app/actions/funnel-public";
import { formatPhone } from "@/lib/phone";
import type { Job } from "@/lib/funnel-types";
import { track } from "./pixel";

const input = "w-full rounded-none border-0 border-b border-black/25 bg-transparent px-0 py-3 text-base outline-none transition placeholder:text-black/35 focus:border-[var(--c)]";
const button = "flex w-full items-center justify-center gap-2 rounded-full bg-[#111] px-4 py-4 text-base font-medium text-white transition hover:bg-[var(--c)] disabled:opacity-50";

/** (11) 99999-8888 enquanto digita */
function maskPhone(v: string) {
  const d = v.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, d.length - 4)}-${d.slice(-4)}`;
}

export function Signup({
  funnelKey,
  cta,
  jobTitle,
  utm,
  privacyHref,
  jobs,
  job,
  onJob,
}: {
  funnelKey: string;
  cta: string;
  jobTitle: string;
  utm: Record<string, string>;
  privacyHref: string;
  jobs: Job[];
  job: string;
  onJob: (id: string) => void;
}) {
  const [state, formAction, pending] = useActionState(signupAction.bind(null, funnelKey), undefined);
  const [phone, setPhone] = useState("");
  const [editing, setEditing] = useState(false);
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    if (state?.token && !state.already) {
      setEditing(false);
      track("Lead");
    }
  }, [state]);

  const chosen = jobs.find((j) => j.id === job)?.title ?? jobTitle;
  if (verified || state?.already) return <Done jobTitle={chosen} already={Boolean(state?.already) && !verified} />;
  if (state?.token && !editing)
    return (
      <Code
        token={state.token}
        phone={state.phone ?? ""}
        onBack={() => setEditing(true)}
        onDone={() => {
          track("CompleteRegistration");
          setVerified(true);
        }}
      />
    );

  return (
    <form action={formAction} className="space-y-3">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Faça sua inscrição</h2>
        <p className="mt-1 text-black/55">Leva menos de 1 minuto. Você vai receber um código no WhatsApp para confirmar.</p>
      </div>
      {jobs.length > 0 && (
        <select name="job" required value={job} onChange={(e) => onJob(e.target.value)} className={input}>
          <option value="" disabled>
            Escolha a vaga
          </option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.title}
            </option>
          ))}
        </select>
      )}
      <input name="name" required placeholder="Nome completo" autoComplete="name" className={input} />
      <input
        name="phone"
        required
        placeholder="WhatsApp com DDD"
        inputMode="tel"
        autoComplete="tel-national"
        value={phone}
        onChange={(e) => setPhone(maskPhone(e.target.value))}
        className={input}
      />
      <input name="email" type="email" placeholder="E-mail" autoComplete="email" className={input} />
      {/* Campo escondido contra robôs */}
      <input name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      {Object.entries(utm).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
      <label className="flex items-start gap-2.5 pt-1 text-xs leading-relaxed text-black/55">
        <input type="checkbox" name="consent" defaultChecked className="mt-0.5 size-4 accent-[var(--c)]" />
        <span>
          Aceito receber mensagens sobre o processo seletivo no meu WhatsApp. Posso sair quando quiser respondendo SAIR.{" "}
          <a href={privacyHref} className="underline" target="_blank">
            Privacidade
          </a>
        </span>
      </label>
      {state?.error && <p className="bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{state.error}</p>}
      <button className={button} disabled={pending}>
        {pending ? <Loader2 className="size-5 animate-spin" /> : cta}
      </button>
    </form>
  );
}

function Code({ token, phone, onBack, onDone }: { token: string; phone: string; onBack: () => void; onDone: () => void }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [wait, setWait] = useState(60);
  const [pending, start] = useTransition();

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  const submit = (value: string) =>
    start(async () => {
      setError("");
      const res = await verifyCodeAction(token, value);
      if (res.ok) onDone();
      else setError(res.error ?? "Não deu certo, tente de novo.");
    });

  return (
    <div className="space-y-4">
            <div>
        <h2 className="text-2xl font-semibold tracking-tight">Confirme seu WhatsApp</h2>
        <p className="mt-1 text-black/55">
          Enviamos um código de 6 números para <b className="text-black">{phone ? formatPhone(phone) : "seu WhatsApp"}</b>. Ele chega em poucos segundos.
        </p>
      </div>
      <input
        value={code}
        onChange={(e) => {
          const v = e.target.value.replace(/\D/g, "").slice(0, 6);
          setCode(v);
          if (v.length === 6) submit(v);
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        placeholder="000000"
        autoFocus
        className={`${input} text-center font-mono text-3xl tracking-[0.5em]`}
      />
      {error && <p className="bg-red-50 px-3 py-2 text-sm font-medium text-red-600">{error}</p>}
      {info && !error && <p className="bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">{info}</p>}
      <button className={button} disabled={pending || code.length !== 6} onClick={() => submit(code)}>
        {pending ? <Loader2 className="size-5 animate-spin" /> : "Confirmar"}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button type="button" onClick={onBack} className="text-black/55 underline">
          Corrigir número
        </button>
        <button
          type="button"
          disabled={wait > 0 || pending}
          className="font-semibold text-[var(--c)] disabled:text-black/40"
          onClick={() =>
            start(async () => {
              setError("");
              const res = await resendCodeAction(token);
              if (res.ok) {
                setInfo("Código reenviado. Confira seu WhatsApp.");
                setWait(60);
              } else setError(res.error ?? "Não deu para reenviar.");
            })
          }
        >
          {wait > 0 ? `Reenviar em ${wait}s` : "Reenviar código"}
        </button>
      </div>
    </div>
  );
}

function Done({ jobTitle, already }: { jobTitle: string; already: boolean }) {
  return (
    <div className="py-4 text-center">
      <CheckCircle2 className="mx-auto size-14 text-emerald-500" />
      <h2 className="mt-3 text-2xl font-semibold tracking-tight">{already ? "Você já está inscrito!" : "Inscrição confirmada!"}</h2>
      <p className="mt-2 text-black/55">
        {already
          ? `Seu WhatsApp já está confirmado na vaga de ${jobTitle}. Fique de olho nas mensagens.`
          : `Pronto! Você está participando do processo seletivo para ${jobTitle}. As próximas etapas chegam no seu WhatsApp.`}
      </p>
    </div>
  );
}
