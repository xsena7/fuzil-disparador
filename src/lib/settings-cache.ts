// Cache das configurações salvas pelo painel. Fica em globalThis para ser o MESMO objeto
// em todas as partes do servidor (instrumentation, páginas e ações), mesmo após reiniciar.
const g = globalThis as unknown as { __fuzilSettings?: Map<string, string> };
const cache = (g.__fuzilSettings ??= new Map<string, string>());

export function cachedSetting(key: string): string | undefined {
  const v = cache.get(key);
  return v ? v : undefined;
}

export function replaceSettings(entries: Array<[string, string]>) {
  cache.clear();
  for (const [k, v] of entries) cache.set(k, v);
}
