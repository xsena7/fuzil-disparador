"use client";

import { useEffect, useState, type ComponentProps } from "react";
import { Input } from "./ui";

/**
 * Campo que não se apaga quando o formulário é enviado (o React limpa os campos depois de cada envio, até quando dá erro).
 * Com `remember`, guarda o último valor neste navegador (ex.: o nome de exibição de cada WABA).
 */
export function KeepInput({ remember, defaultValue, ...props }: Omit<ComponentProps<typeof Input>, "value" | "onChange" | "defaultValue"> & { remember?: string; defaultValue?: string | number }) {
  const [value, setValue] = useState(String(defaultValue ?? ""));
  useEffect(() => {
    if (!remember) return;
    try {
      const saved = localStorage.getItem(`keep:${remember}`);
      if (saved) setValue(saved);
    } catch {}
  }, [remember]);
  return (
    <Input
      {...props}
      value={value}
      onChange={(e) => {
        setValue(e.target.value);
        if (remember)
          try {
            localStorage.setItem(`keep:${remember}`, e.target.value);
          } catch {}
      }}
    />
  );
}
