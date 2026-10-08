import { Badge, type BadgeColor } from "./ui";

export function QualityBadge({ q }: { q?: string | null }) {
  const map: Record<string, [BadgeColor, string]> = {
    GREEN: ["green", "Qualidade alta"],
    YELLOW: ["yellow", "Qualidade média"],
    RED: ["red", "Qualidade baixa"],
  };
  const [color, label] = map[q ?? ""] ?? ["gray", "Qualidade —"];
  return <Badge color={color}>{label}</Badge>;
}

export function CategoryBadge({ c }: { c: string }) {
  if (c === "UTILITY") return <Badge color="green">Utilidade</Badge>;
  if (c === "MARKETING") return <Badge color="red">Marketing</Badge>;
  if (c === "AUTHENTICATION") return <Badge color="blue">Autenticação</Badge>;
  return <Badge>{c}</Badge>;
}

export function TemplateStatusBadge({ s }: { s: string }) {
  const map: Record<string, [BadgeColor, string]> = {
    APPROVED: ["green", "Aprovado"],
    PENDING: ["yellow", "Em análise"],
    IN_APPEAL: ["yellow", "Em recurso"],
    REJECTED: ["red", "Rejeitado"],
    PAUSED: ["red", "Pausado"],
    DISABLED: ["red", "Desativado"],
  };
  const [color, label] = map[s] ?? ["gray", s];
  return <Badge color={color}>{label}</Badge>;
}

export function CampaignStatusBadge({ s }: { s: string }) {
  const map: Record<string, [BadgeColor, string]> = {
    DRAFT: ["gray", "Rascunho"],
    SCHEDULED: ["blue", "Agendada"],
    RUNNING: ["orange", "Enviando"],
    PAUSED: ["yellow", "Pausada"],
    COMPLETED: ["green", "Concluída"],
    CANCELLED: ["gray", "Cancelada"],
  };
  const [color, label] = map[s] ?? ["gray", s];
  return <Badge color={color}>{label}</Badge>;
}
