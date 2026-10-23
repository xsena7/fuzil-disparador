"use client";

import { useState } from "react";
import clsx from "clsx";
import { Briefcase, Check, Link2, Sparkles } from "lucide-react";
import { Field, Input, Select } from "@/components/ui";

const TYPES = [
  {
    kind: "JOBS",
    icon: Briefcase,
    title: "Vagas de emprego",
    text: "Página de vagas num domínio seu. A pessoa se inscreve, confirma o código no WhatsApp e entra no funil de mensagens.",
  },
  {
    kind: "LINKS",
    icon: Link2,
    title: "Login do gerador de links",
    text: "Seus clientes entram no gerador de links pelo WhatsApp: código no login, aviso a cada acesso (Fui eu / Não fui eu) e boas-vindas. Templates prontos.",
  },
] as const;

/** Campos do "Novo funil": escolhe o tipo e mostra só o que aquele tipo precisa. */
export function NewFunnelFields({
  groups,
  canLinks,
  linksExists,
  models = [],
}: {
  groups: Array<{ id: string; name: string }>;
  canLinks: boolean;
  linksExists: boolean;
  models?: Array<{ id: string; name: string; sub?: string }>;
}) {
  const [kind, setKind] = useState<"JOBS" | "LINKS">("JOBS");
  // Modelo escolhido ("" = funil padrão do zero). Começa no primeiro modelo pronto
  const [model, setModel] = useState(models[0]?.id ?? "");
  // Já vem com o grupo "Aquecimento" escolhido, se existir
  const warmGroup = groups.find((g) => /aquec/i.test(g.name))?.id ?? "";
  const types = canLinks ? TYPES : TYPES.filter((t) => t.kind === "JOBS");
  return (
    <div className="space-y-4">
      <input type="hidden" name="kind" value={kind} />
      {types.length > 1 && (
        <div className="grid gap-3 md:grid-cols-2">
          {types.map((t) => {
            const off = t.kind === "LINKS" && linksExists;
            return (
              <button
                key={t.kind}
                type="button"
                disabled={off}
                onClick={() => setKind(t.kind)}
                className={clsx(
                  "flex gap-3 rounded-2xl border p-4 text-left transition",
                  kind === t.kind ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100" : "border-zinc-200 bg-white hover:border-brand-200",
                  off && "cursor-not-allowed opacity-50",
                )}
              >
                <span className={clsx("grid size-10 shrink-0 place-items-center rounded-xl", kind === t.kind ? "bg-brand-gradient text-white" : "bg-zinc-100 text-zinc-500")}>
                  <t.icon className="size-5" />
                </span>
                <span>
                  <b className="block text-zinc-900">{t.title}</b>
                  <span className="text-sm text-zinc-500">{off ? "Você já tem esse funil (só pode um)." : t.text}</span>
                </span>
              </button>
            );
          })}
        </div>
      )}
      {kind === "JOBS" && models.length > 0 && (
        <div>
          <input type="hidden" name="modelId" value={model} />
          <div className="mb-2 text-sm font-semibold text-zinc-800">Escolha um modelo pronto (é só clicar)</div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[...models.map((m) => ({ ...m, ready: true })), { id: "", name: "Do zero", sub: "Funil padrão do Fuzil, para você montar do seu jeito", ready: false }].map((m) => {
              const on = model === m.id;
              return (
                <button
                  key={m.id || "zero"}
                  type="button"
                  onClick={() => setModel(m.id)}
                  className={clsx(
                    "relative flex gap-3 rounded-2xl border p-4 text-left transition",
                    on ? "border-brand-400 bg-brand-50 ring-2 ring-brand-100" : "border-zinc-200 bg-white hover:border-brand-200 hover:bg-orange-50/40",
                  )}
                >
                  <span className={clsx("grid size-10 shrink-0 place-items-center rounded-xl", on ? "bg-brand-gradient text-white" : "bg-orange-100 text-orange-700")}>
                    {m.ready ? <Sparkles className="size-5" /> : <Briefcase className="size-5" />}
                  </span>
                  <span className="min-w-0">
                    <b className="block truncate text-zinc-900">{m.name}</b>
                    <span className="text-xs text-zinc-500">{m.sub ?? "Página, vagas, perguntas, mensagens e timers prontos. Os templates sobem sozinhos nas BMs do grupo."}</span>
                  </span>
                  {on && <Check className="absolute right-3 top-3 size-4 text-brand-600" />}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <div className="grid gap-4 md:grid-cols-3">
        <Field label="Nome (só você vê)">
          <Input name="name" required placeholder={kind === "LINKS" ? "Login do gerador de links" : "Vagas tech"} key={kind} defaultValue={kind === "LINKS" ? "Login do gerador de links" : ""} />
        </Field>
        {kind === "JOBS" && (
          <Field label="Endereço" hint="Usado em /v/endereco enquanto não tiver domínio próprio">
            <Input name="slug" placeholder="vagas-tech" />
          </Field>
        )}
        <Field label="Grupo de BM que dispara" hint={kind === "LINKS" ? "Manda o código, os avisos de acesso e as boas-vindas" : undefined}>
          <Select name="groupId" required defaultValue={warmGroup}>
            <option value="" disabled>
              Escolha
            </option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>
    </div>
  );
}
