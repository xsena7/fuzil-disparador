"use client";

// Tema escuro da plataforma: liga/desliga na hora (classe dk no <html>) e lembra a escolha num cookie.
import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ initial }: { initial: boolean }) {
  const [dark, setDark] = useState(initial);
  useEffect(() => {
    document.documentElement.classList.toggle("dk", dark);
  }, [dark]);
  // Saindo da plataforma (ex.: relatório público), volta ao claro
  useEffect(() => () => document.documentElement.classList.remove("dk"), []);
  const flip = () => {
    const v = !dark;
    setDark(v);
    document.cookie = `fz_theme=${v ? "dark" : "light"}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  };
  return (
    <button type="button" onClick={flip} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-zinc-100">
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />} {dark ? "Tema claro" : "Tema escuro"}
    </button>
  );
}
