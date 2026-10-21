// Tipos e constantes do Aquecimento que também rodam no navegador (sem banco nem crypto).
import type { VariableMapping } from "./template-utils";

export type Job = {
  id: string;
  title: string;
  area: string;
  level: string;
  salary: string;
  description: string;
  requirements: string[];
  open: boolean;
  /** Quantas pessoas a empresa quer contratar nesse cargo (padrão 200) */
  positions?: number;
};

/** Vagas por cargo quando o campo não foi preenchido. */
export const DEFAULT_POSITIONS = 200;
export const jobPositions = (j: Pick<Job, "positions">) => (j.positions && j.positions > 0 ? j.positions : DEFAULT_POSITIONS);

export type FunnelPage = {
  company: string;
  jobTitle: string;
  headline: string;
  subtitle: string;
  about: string;
  benefits: string[];
  requirements: string[];
  cta: string;
  color: string;
  salary?: string;
  location?: string;
  jobs: Job[];
};

export type FormField = { key: string; label: string; type: "text" | "textarea" | "select"; options?: string[]; required?: boolean };

export type WaitStep = { id: string; type: "wait"; amount: number; unit: "minutes" | "hours" | "days" };
export type SendStep = { id: string; type: "send"; blueprintId: string; mapping: VariableMapping; onlyIfPending?: boolean };
export type FunnelStep = WaitStep | SendStep;

/** Campos que as mensagens do funil podem usar nas variáveis. */
export const LEAD_FIELDS: Array<{ value: string; label: string }> = [
  { value: "firstName", label: "Primeiro nome" },
  { value: "name", label: "Nome completo" },
  { value: "email", label: "E-mail" },
  { value: "phone", label: "WhatsApp" },
  { value: "col:vaga", label: "Nome da vaga" },
  { value: "col:empresa", label: "Nome da empresa" },
  { value: "col:link", label: "Link do cadastro" },
];

