// Vermelho (crítico) só para o que é grave de verdade: template virou marketing, template excluído e banimento.
// Todo o resto fica no máximo amarelo (atenção).
import type { AlertSeverity } from "@prisma/client";

const RED: RegExp[] = [
  /recategorizado: .*→\s*MARKETING/i, // template foi movido para marketing
  /virou MARKETING/i,
  /\bfoi exclu[ií]do\b/i, // template excluído
  /\bbanid[oa]s?\b/i, // número ou BM banida ("foi para 🚫 Banidas", "Número ... banido")
  /: (DISABLED_UPDATE|ACCOUNT_VIOLATION|ACCOUNT_DELETED|ACCOUNT_OFFBOARDED)$/, // a Meta desativou ou baniu a conta
];

export function isRedAlert(title: string) {
  return !/\bvoltou\b/i.test(title) && RED.some((re) => re.test(title));
}

export function alertSeverity(title: string, severity: AlertSeverity): AlertSeverity {
  if (isRedAlert(title)) return "CRITICAL";
  return severity === "CRITICAL" ? "WARNING" : severity;
}
