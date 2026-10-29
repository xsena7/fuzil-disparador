import type { Metadata, Viewport } from "next";
import "./globals.css";
import { PwaRegister } from "@/components/pwa-register";

export const metadata: Metadata = {
  title: "Fuzil Disparador",
  description: "Gestão de BMs e disparos pela API oficial do WhatsApp",
  // App no celular (iPhone usa estes; o Android usa o manifest)
  appleWebApp: { capable: true, title: "Fuzil", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = { themeColor: "#FF6A2B" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="antialiased text-sm">
        {children}
        <PwaRegister />
      </body>
    </html>
  );
}
