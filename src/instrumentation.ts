export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startSettingsRefresh } = await import("./lib/platform-settings");
    await startSettingsRefresh();
  }
}
