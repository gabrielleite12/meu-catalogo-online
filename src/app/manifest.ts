import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vitrine Zap — catálogos online",
    short_name: "Vitrine Zap",
    description: "Catálogos online, pedidos pelo WhatsApp e controle de entregas.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#16803c",
    lang: "pt-BR",
    categories: ["shopping", "business"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Meus catálogos e pedidos", short_name: "Painel", url: "/painel", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
      { name: "Meus pedidos", short_name: "Pedidos", url: "/conta", icons: [{ src: "/icons/icon-192.png", sizes: "192x192" }] },
    ],
  };
}
