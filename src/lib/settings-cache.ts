// Cache em memória das configurações salvas pelo painel (sem dependências, pode ser lido em qualquer lugar).
const cache = new Map<string, string>();

export function cachedSetting(key: string): string | undefined {
  const v = cache.get(key);
  return v ? v : undefined;
}

export function replaceSettings(entries: Array<[string, string]>) {
  cache.clear();
  for (const [k, v] of entries) cache.set(k, v);
}
