"use client";

import { useState, type ComponentProps } from "react";
import clsx from "clsx";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "./ui";

/** Campo de senha com o "olhinho" para mostrar/esconder o que foi digitado. */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  const [show, setShow] = useState(false);
  return (
    <span className="relative block">
      <Input {...props} type={show ? "text" : "password"} className={clsx("pr-11", className)} />
      <button
        type="button"
        onClick={() => setShow(!show)}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-zinc-400 transition hover:text-zinc-700"
        aria-label={show ? "Esconder senha" : "Mostrar senha"}
        title={show ? "Esconder" : "Mostrar"}
        tabIndex={-1}
      >
        {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </span>
  );
}
