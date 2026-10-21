"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Loader2, Plus, Trash2 } from "lucide-react";
import { saveJobsAction } from "@/app/actions/funnels";
import type { Job } from "@/lib/funnel-types";
import { Button } from "@/components/ui";

const inp = "w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm";
type Row = Job & { reqText: string };

/** Vagas que aparecem em cartões na landing page. */
export function JobsEditor({ funnelId, initial }: { funnelId: string; initial: Job[] }) {
  const [jobs, setJobs] = useState<Row[]>(initial.map((j) => ({ ...j, reqText: j.requirements.join("\n") })));
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [msg, setMsg] = useState<{ ok?: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();
  const patch = (i: number, p: Partial<Row>) => {
    setJobs(jobs.map((j, k) => (k === i ? { ...j, ...p } : j)));
    setMsg(null);
  };

  return (
    <div className="space-y-2">
      {jobs.map((j, i) => (
        <div key={i} className="rounded-xl border border-zinc-200">
          <div className="flex items-center gap-3 px-3 py-2.5">
            <button type="button" onClick={() => setOpenIdx(openIdx === i ? null : i)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <ChevronRight className={`size-4 shrink-0 text-zinc-400 transition-transform ${openIdx === i ? "rotate-90" : ""}`} />
              <span className={`size-2 shrink-0 rounded-full ${j.open ? "bg-emerald-500" : "bg-zinc-300"}`} />
              <span className="truncate font-medium">{j.title || "Nova vaga"}</span>
              <span className="truncate text-xs text-zinc-500">{[`${j.positions ?? 200} vagas`, j.area, j.level, j.salary].filter(Boolean).join(" · ")}</span>
            </button>
            <label className="flex shrink-0 items-center gap-1.5 text-xs text-zinc-600">
              <input type="checkbox" checked={j.open} onChange={(e) => patch(i, { open: e.target.checked })} /> Aberta
            </label>
            <button type="button" onClick={() => setJobs(jobs.filter((_, k) => k !== i))} className="rounded p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600">
              <Trash2 className="size-4" />
            </button>
          </div>
          {openIdx === i && (
            <div className="grid gap-3 border-t border-zinc-100 p-3 sm:grid-cols-2">
              <input value={j.title} onChange={(e) => patch(i, { title: e.target.value })} placeholder="Cargo (ex.: Suporte Técnico N1)" className={inp} />
              <input value={j.area} onChange={(e) => patch(i, { area: e.target.value })} placeholder="Área (ex.: Desenvolvimento)" className={inp} />
              <input value={j.level} onChange={(e) => patch(i, { level: e.target.value })} placeholder="Nível (ex.: Júnior, Sem experiência)" className={inp} />
              <input value={j.salary} onChange={(e) => patch(i, { salary: e.target.value })} placeholder="Salário (ex.: R$ 2.500)" className={inp} />
              <label className="flex items-center gap-2 text-sm text-zinc-600">
                Quantidade de vagas
                <input type="number" min={1} value={j.positions ?? 200} onChange={(e) => patch(i, { positions: Number(e.target.value) })} className={`${inp} w-28`} />
              </label>
              <textarea value={j.description} onChange={(e) => patch(i, { description: e.target.value })} placeholder="O que a pessoa vai fazer" rows={4} className={inp} />
              <textarea value={j.reqText} onChange={(e) => patch(i, { reqText: e.target.value })} placeholder="Requisitos (um por linha)" rows={4} className={inp} />
            </div>
          )}
        </div>
      ))}
      <div className="flex flex-wrap items-center gap-3 pt-2">
        <Button
          variant="secondary"
          type="button"
          onClick={() => {
            setJobs([...jobs, { id: "", title: "", area: "", level: "", salary: "", description: "", requirements: [], open: true, positions: 200, reqText: "" }]);
            setOpenIdx(jobs.length);
          }}
        >
          <Plus className="size-4" /> Vaga
        </Button>
        <Button
          disabled={pending}
          onClick={() =>
            start(async () => {
              const res = await saveJobsAction(
                funnelId,
                jobs.map(({ reqText, ...j }) => ({ ...j, requirements: reqText.split("\n").map((r) => r.trim()).filter(Boolean) })),
              );
              setMsg(res.ok ? { ok: true, text: "Vagas salvas" } : { text: res.error ?? "Erro ao salvar" });
              if (res.ok) router.refresh();
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />} Salvar vagas
        </Button>
        {msg && <span className={msg.ok ? "text-emerald-700" : "text-red-600"}>{msg.text}</span>}
      </div>
    </div>
  );
}
