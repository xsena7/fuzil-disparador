// Identidade visual do Fuzil Disparador: AK-47 com "FUZIL" em letras de bloco.
import { useId } from "react";

const AK = "M18 66 L140 74 L140 98 L26 122 Q16 124 15 114 L14 72 Q14 66 18 66 Z M136 70 L306 66 L306 102 L136 100 Z M150 66 L296 62 L300 66 L150 70 Z M232 98 L256 98 L246 146 Q244 152 236 151 L222 148 Q216 146 218 140 Z M200 100 L200 110 Q200 116 208 116 L232 116 L232 110 L210 110 L210 100 Z M272 100 L304 100 Q314 128 342 156 L314 166 Q286 136 272 100 Z M304 76 L392 78 Q398 79 398 85 L398 96 Q398 101 392 101 L304 102 Z M300 60 L438 63 Q444 64 444 69 Q444 74 438 75 L300 76 Z M396 80 L556 81 L556 89 L396 92 Z M516 64 L524 64 L526 80 L530 80 L530 92 L512 92 L512 80 L516 80 Z M552 77 L584 78 Q588 78 588 82 L588 88 Q588 92 584 92 L552 93 Z";
const LETTERS = '<path transform="translate(0 0)" d="M0 0 H44 V14 H14 V24 H36 V37 H14 V60 H0 Z"/><path transform="translate(52 0)" d="M0 0 H14 V40 Q14 46 20 46 H28 Q34 46 34 40 V0 H48 V42 Q48 60 30 60 H18 Q0 60 0 42 Z"/><path transform="translate(108 0)" d="M0 0 H46 V14 L18 46 H46 V60 H0 V46 L28 14 H0 Z"/><path transform="translate(162 0)" d="M0 0 H14 V60 H0 Z"/><path transform="translate(184 0)" d="M0 0 H14 V46 H42 V60 H0 Z"/>';

/** Logo horizontal. tone="dark" para fundos escuros (letras claras). */
export function Logo({ className, tone = "dark", subtitle = true }: { className?: string; tone?: "dark" | "light"; subtitle?: boolean }) {
  const id = useId().replace(/:/g, "");
  const outline = tone === "dark" ? "#0b0b0f" : "#ffffff";
  return (
    <svg viewBox={subtitle ? "0 0 640 230" : "0 0 640 200"} className={className} role="img" aria-label="Fuzil Disparador">
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#ef2d56" />
        </linearGradient>
        <linearGradient id={`t${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={tone === "dark" ? "#ffffff" : "#18181b"} />
          <stop offset="1" stopColor={tone === "dark" ? "#ffd7c2" : "#3f3f46"} />
        </linearGradient>
      </defs>
      <path d={AK} fill={`url(#g${id})`} transform="translate(20 22)" />
      <g
        transform="translate(150.5 58) skewX(-10) scale(1.5)"
        fill={`url(#t${id})`}
        stroke={outline}
        strokeWidth={5}
        paintOrder="stroke"
        strokeLinejoin="round"
        dangerouslySetInnerHTML={{ __html: LETTERS }}
      />
      {subtitle && (
        <text x="320" y="212" textAnchor="middle" fontFamily="inherit" fontWeight={800} fontSize={20} letterSpacing={12} fill={tone === "dark" ? "#ffffff" : "#18181b"} fillOpacity={0.7}>
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
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Fuzil Disparador">
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ff8a1f" />
          <stop offset="1" stopColor="#ef2d56" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill={`url(#m${id})`} />
      <g transform="translate(32 33) rotate(-40) scale(0.118) translate(-301 -113)">
        <path d={AK} fill="#ffffff" />
      </g>
    </svg>
  );
}
