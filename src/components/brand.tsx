// Identidade visual do Fuzil Disparador: "FUZIL" em degradê laranja → vermelho (arquivo FUZIL.svg da marca).
import { useId } from "react";

/** A palavra FUZIL inteira (coordenadas do arquivo original, 259.2×259.2). */
const WORD_PATH =
  "M158.02,148.12h-44.24s9.7-10.64,9.7-10.64l29.88-14.25-19.48-.18c-.89-.24-1.51-1.02-1.63-1.92l4.02-7.17h44.64s-7.1,9.18-7.1,9.18l-29.52,14.22,22.49.11-8.75,10.64ZM58.92,148.12h48.34s10.61-9.12,10.61-9.12l14.75-25.03h-14.13s-10.48,17.49-10.48,17.49c-.95,2.31-2.21,4.32-4.36,5.68l-20.47-.34,12.8-16.89-13.56.02-23.51,28.19ZM204.41,136.52l19.08-30.38-14.12-.03c-.78.1-1.43.29-2.08.76l-24.24,41.25h53.31s12.2-11.59,12.2-11.59l-44.15-.02ZM35.06,118.98c1.8-2.2,4.16-3.61,7.18-3.46l41.88-.64,9.33-11.01-58.39,1.78c-1.99-.04-3.63.15-5.31,1.14l-19.46,23.33,17.95-4.11c.44-.16,1.5-.51,1.78-.86l5.04-6.17ZM46.63,132.04c.7-.88,1.66-1.23,2.78-1.08l21.21-.48,8.64-9.69-35.16.54c-.98.02-3.02.1-3.69.89l-27.71,32.9,17.36-3.97c1.35-.31,2.17-.96,3.08-2.11l13.48-17ZM199.06,113.97h-14.13s-20.69,34.17-20.69,34.17l14.48-.05,20.34-34.12Z";

/** Só o F (as duas lâminas da esquerda), para o ícone. */
export const MARK_PATH =
  "M35.06,118.98c1.8-2.2,4.16-3.61,7.18-3.46l41.88-.64,9.33-11.01-58.39,1.78c-1.99-.04-3.63.15-5.31,1.14l-19.46,23.33,17.95-4.11c.44-.16,1.5-.51,1.78-.86l5.04-6.17ZM46.63,132.04c.7-.88,1.66-1.23,2.78-1.08l21.21-.48,8.64-9.69-35.16.54c-.98.02-3.02.1-3.69.89l-27.71,32.9,17.36-3.97c1.35-.31,2.17-.96,3.08-2.11l13.48-17Z";

function Gradient({ id, from = 10.29, to = 248.56 }: { id: string; from?: number; to?: number }) {
  return (
    <linearGradient id={id} gradientUnits="userSpaceOnUse" x1={from} y1="129.49" x2={to} y2="129.49">
      <stop offset="0" stopColor="#ff9500" />
      <stop offset="1" stopColor="#ff193a" />
    </linearGradient>
  );
}

/** Logo completa (plataforma, onboarding, site e e-mails). */
export function Logo({ className }: { className?: string; tone?: "dark" | "light" }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="8 101 243 57" className={className} role="img" aria-label="Fuzil Disparador">
      <defs>
        <Gradient id={`g${id}`} />
      </defs>
      <path d={WORD_PATH} fill={`url(#g${id})`} />
    </svg>
  );
}

/** Ícone quadrado (mesmo desenho do favicon). */
export function LogoMark({ className }: { className?: string }) {
  const id = useId().replace(/:/g, "");
  return (
    <svg viewBox="0 0 100 100" className={className} role="img" aria-label="Fuzil Disparador">
      <defs>
        <Gradient id={`m${id}`} from={10.29} to={93.45} />
      </defs>
      <rect width="100" height="100" rx="22" fill="#1d1d20" />
      <path d={MARK_PATH} fill={`url(#m${id})`} transform="translate(50 50) scale(0.98) translate(-51.87 -129.5)" />
    </svg>
  );
}
