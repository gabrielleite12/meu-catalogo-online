"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISS = "pwa-install-dismissed";

/** Registra o service worker e oferece instalar o app (Android/desktop: botão nativo; iPhone: instrução). */
export default function PwaRegister() {
  const path = usePathname();
  const [evt, setEvt] = useState<Prompt | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => {});
    let dismissed = false;
    try { dismissed = Date.now() - Number(localStorage.getItem(DISMISS) || 0) < 14 * 864e5; } catch {}
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
    if (dismissed || standalone) return;
    setHidden(false);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream);
    const on = (e: Event) => { e.preventDefault(); setEvt(e as Prompt); };
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", () => setHidden(true));
    return () => window.removeEventListener("beforeinstallprompt", on);
  }, []);

  const close = () => { setHidden(true); try { localStorage.setItem(DISMISS, String(Date.now())); } catch {} };
  const show = !hidden && (evt || ios) && (path === "/" || path.startsWith("/painel") || path.startsWith("/conta"));
  if (!show) return null;
  return (
    <div className="install" role="dialog" aria-label="Instalar o app">
      <img src="/icons/icon-192.png" alt="" width={44} height={44} />
      <div className="it">
        <b>Instale a Vitrine Zap</b>
        <small>{evt ? "Abra como um app, com avisos de pedidos." : "Toque em Compartilhar e depois em “Adicionar à Tela de Início”."}</small>
      </div>
      {evt && <button className="btn primary sm" onClick={async () => { await evt.prompt(); await evt.userChoice; setEvt(null); close(); }}>Instalar</button>}
      <button className="btn ghost sm" onClick={close} aria-label="Agora não">✕</button>
    </div>
  );
}
