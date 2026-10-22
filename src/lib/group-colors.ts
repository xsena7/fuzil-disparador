/** Cores das etiquetas dos grupos (classes completas, para o Tailwind não cortar). */
export const GROUP_COLORS = {
  zinc: { label: "Cinza", dot: "bg-zinc-500", stripe: "border-l-zinc-400", tag: "bg-zinc-100 text-zinc-700 ring-zinc-500/20" },
  red: { label: "Vermelho", dot: "bg-red-500", stripe: "border-l-red-500", tag: "bg-red-50 text-red-700 ring-red-600/20" },
  orange: { label: "Laranja", dot: "bg-orange-500", stripe: "border-l-orange-500", tag: "bg-orange-50 text-orange-700 ring-orange-600/20" },
  amber: { label: "Amarelo", dot: "bg-amber-400", stripe: "border-l-amber-400", tag: "bg-amber-50 text-amber-800 ring-amber-600/20" },
  emerald: { label: "Verde", dot: "bg-emerald-500", stripe: "border-l-emerald-500", tag: "bg-emerald-50 text-emerald-700 ring-emerald-600/20" },
  sky: { label: "Azul", dot: "bg-sky-500", stripe: "border-l-sky-500", tag: "bg-sky-50 text-sky-700 ring-sky-600/20" },
  violet: { label: "Roxo", dot: "bg-violet-500", stripe: "border-l-violet-500", tag: "bg-violet-50 text-violet-700 ring-violet-600/20" },
  pink: { label: "Rosa", dot: "bg-pink-500", stripe: "border-l-pink-500", tag: "bg-pink-50 text-pink-700 ring-pink-600/20" },
  black: { label: "Preto", dot: "bg-zinc-900", stripe: "border-l-zinc-900", tag: "bg-zinc-900 text-white ring-zinc-900/20" },
} as const;

export type GroupColor = keyof typeof GROUP_COLORS;
export const isGroupColor = (v: string): v is GroupColor => v in GROUP_COLORS;
export const groupTag = (color?: string | null) => GROUP_COLORS[(color && isGroupColor(color) ? color : "amber") as GroupColor].tag;
export const groupDot = (color?: string | null) => GROUP_COLORS[(color && isGroupColor(color) ? color : "zinc") as GroupColor].dot;
export const groupStripe = (color?: string | null) => GROUP_COLORS[(color && isGroupColor(color) ? color : "zinc") as GroupColor].stripe;
