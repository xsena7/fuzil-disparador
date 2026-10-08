export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSettingsRefresh } = await import("./lib/platform-settings");
    await startSettingsRefresh();
  }
}

/** Qualquer erro de página/ação do site vai para Admin → Logs e para o Discord #erros. */
export async function onRequestError(err: unknown, request: { path: string; method: string }, context: { routePath?: string; routeType?: string }) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { reportError } = await import("./lib/report");
  const digest = (err as { digest?: string })?.digest;
  await reportError("web", err, { path: `${request.method} ${request.path}`, digest, detail: context.routeType ? `tipo: ${context.routeType}` : undefined });
}
