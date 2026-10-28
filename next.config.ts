import type { NextConfig } from "next";
import { existsSync, readFileSync } from "node:fs";

// Versão (commit) gravada pelo script de atualização do servidor
const version = existsSync("VERSION") ? readFileSync("VERSION", "utf8").trim() : "dev";

const nextConfig: NextConfig = {
  env: { NEXT_PUBLIC_VERSION: version },
  serverExternalPackages: ["@prisma/client", "bcryptjs"],
  // No servidor (FAST_BUILD=1) pula tipos e lint: já são conferidos antes de subir, e a VM é lenta
  typescript: { ignoreBuildErrors: process.env.FAST_BUILD === "1" },
  eslint: { ignoreDuringBuilds: process.env.FAST_BUILD === "1" },
  experimental: {
    serverActions: { bodySizeLimit: "50mb" },
  },
  poweredByHeader: false,
  // Proteções básicas em todas as páginas: o painel não abre escondido dentro de outro site (clickjacking),
  // o navegador sempre usa HTTPS e não "adivinha" o tipo dos arquivos
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
