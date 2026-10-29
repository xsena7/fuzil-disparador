import type { MetadataRoute } from "next";

/** App do Fuzil no celular (PWA): instala na tela inicial com o ícone do Fuzil e abre sem a barra do navegador. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fuzil Disparador",
    short_name: "Fuzil",
    description: "Gestão de BMs e disparos pela API oficial do WhatsApp",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0b0b0f",
    theme_color: "#FF6A2B",
    lang: "pt-BR",
    icons: [
      { src: "/pwa/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/pwa/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/pwa/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
