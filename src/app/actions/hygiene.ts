"use server";

import { requireAuth } from "@/lib/auth";
import { formatCheck, hygienePhones, type HygieneResult } from "@/lib/hygiene";
import { audienceFileToCsv } from "@/lib/audience-file";
import { tooMany } from "@/lib/rate-limit";

export type HygieneState = (HygieneResult & { error?: undefined }) | { error: string } | undefined;

/** Recebe uma lista (colada ou arquivo) e devolve quem tem WhatsApp. Só checa números da própria conta. */
export async function hygieneAction(_: HygieneState, form: FormData): Promise<HygieneState> {
  const auth = await requireAuth();
  if (auth.role === "MEMBER") return { error: "Só donos e admins fazem higienização" };
  if (tooMany(`hyg:${auth.workspace.id}`, 5, 10 * 60_000)) return { error: "Muitas checagens seguidas. Espere uns minutos." };

  const file = form.get("file");
  let text = String(form.get("numbers") ?? "");
  if (file instanceof File && file.size) {
    if (file.size > 5 * 1024 * 1024) return { error: "Arquivo muito grande (máx. 5 MB)" };
    try {
      text = await audienceFileToCsv(file.name, Buffer.from(await file.arrayBuffer()));
    } catch (err) {
      return { error: err instanceof Error ? err.message : "Não consegui ler o arquivo" };
    }
  }
  // Pega a primeira coluna que parecer telefone (ou a linha inteira)
  const raw = text
    .split(/\r?\n/)
    .map((line) => line.split(/[;,\t]/).find((c) => (c.match(/\d/g) ?? []).length >= 8) ?? "")
    .filter(Boolean);
  if (!raw.length) return { error: "Nenhum número encontrado. Cole um número por linha ou envie uma planilha." };

  // Modo formato: não fala com a Meta e não tem limite de quantidade
  if (form.get("mode") === "format") {
    if (raw.length > 200_000) return { error: "Máximo de 200.000 linhas por vez." };
    return formatCheck(raw);
  }
  const res = await hygienePhones(auth.workspace.id, raw);
  if ("error" in res) return { error: res.error };
  return res;
}
