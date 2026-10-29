"use client";

import { useEffect } from "react";

/** Registra o service worker (o Android só oferece "Instalar app" com ele). */
export function PwaRegister() {
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  }, []);
  return null;
}
