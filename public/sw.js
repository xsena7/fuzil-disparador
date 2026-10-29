// Service worker do app do Fuzil no celular: só o necessário para o celular aceitar instalar.
// Não guarda nada em cache (os dados do painel são sempre os do servidor, ao vivo).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
self.addEventListener("fetch", () => {});
