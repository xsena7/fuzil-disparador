// Identidade visual do Fuzil Disparador: "F" de duas lâminas em degradê laranja → vermelho.
import { useId } from "react";

/** Desenho do "F" (sistema de coordenadas 1080×1080 do arquivo original). */
export const MARK_PATH =
  "M142 545 L323 327 Q333 313 365 312 L937 294 L849 399 L440 406 Q406 408 383 432 L330 497 Q322 505 290 512 Z M165 785 L426 472 Q433 462 470 461 L801 457 L722 546 Q716 550 680 551 L507 553 Q497 552 490 561 L354 734 Q346 743 330 747 Z";

function MarkGradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1="142" y1="600" x2="937" y2="420">
      <stop offset="0" stopColor="#ff9a00" />
      <stop offset="0.55" stopColor="#ff5a2e" />
      <stop offset="1" stopColor="#ff0a3c" />
    </linearGradient>
  );
}

/** Logo horizontal: o "F" + FUZIL. tone="dark" para fundos escuros (letras claras). */
export function Logo({ className, tone = "dark", subtitle = true }: { className?: string; tone?: "dark" | "light"; subtitle?: boolean }) {
  const id = useId().replace(/:/g, "");
  const ink = tone === "dark" ? "#ffffff" : "#18181b";
  return (
    <svg viewBox="0 0 430 110" className={className} role="img" aria-label="Fuzil Disparador">
      <defs>
        <MarkGradient id={`g${id}`} />
      </defs>
      <path d={MARK_PATH} fill={`url(#g${id})`} transform="translate(0 4) scale(0.19) translate(-140 -290)" />
      <text x="166" y={subtitle ? 66 : 78} fontFamily="Inter, 'Segoe UI', Roboto, Arial, sans-serif" fontWeight={900} fontStyle="italic" fontSize={subtitle ? 70 : 82} letterSpacing={2} fill={ink}>
        FUZIL
      </text>
      {subtitle && (
        <text x="170" y="96" fontFamily="Inter, 'Segoe UI', Roboto, Arial, sans-serif" fontWeight={700} fontSize={17} letterSpacing={9.4} fill={ink} fillOpacity={0.6}>
          DISPARADOR
        </text>
      )}
    </svg>
  );
}

/** Ícone quadrado (mesmo desenho do favicon). */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 1080 1080" className={className} role="img" aria-label="Fuzil Disparador">
      <defs>
        <MarkGradient id={`m${id}`} />
      </defs>
      <rect width="1080" height="1080" rx="230" fill="#1d1d20" />
      <path d={MARK_PATH} fill={`url(#m${id})`} transform="translate(540 540) scale(1.18) translate(-540 -540)" />
    </svg>
  );
}
