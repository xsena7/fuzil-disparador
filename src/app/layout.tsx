import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Fuzil Disparador",
  description: "Gestão de BMs e disparos pela API oficial do WhatsApp",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased text-sm">{children}</body>
    </html>
  );
}
