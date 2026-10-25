import type { Metadata, Viewport } from "next";
import Link from "next/link";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";

export const metadata: Metadata = {
  title: "Expositor — catálogos online com suas fotos do Drive",
  description: "Monte seu catálogo com as fotos do Google Drive e receba pedidos pelo WhatsApp.",
  applicationName: "Expositor",
  appleWebApp: { capable: true, title: "Expositor", statusBarStyle: "default" },
  icons: { icon: [{ url: "/icons/icon-192.png", sizes: "192x192" }, { url: "/icons/icon-512.png", sizes: "512x512" }], apple: "/icons/apple-touch-icon.png" },
  formatDetection: { telephone: false },
};
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#16803c" };

export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>
      {children}
      <PwaRegister />
      <footer className="foot"><Link href="/ajuda">Como funciona</Link><Link href="/privacidade">Privacidade</Link><Link href="/termos">Termos</Link></footer>
    </body></html>;
}
