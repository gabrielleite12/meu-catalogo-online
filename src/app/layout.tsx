import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Expositor — catálogos online com suas fotos do Drive",
  description: "Monte seu catálogo com as fotos do Google Drive e receba pedidos pelo WhatsApp.",
};
export const viewport: Viewport = { width: "device-width", initialScale: 1 };

export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
