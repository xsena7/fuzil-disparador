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
};

export default nextConfig;
