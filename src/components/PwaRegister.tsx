"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Prompt = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> };
const DISMISS = "pwa-install-dismissed";

/**
 * Registra o service worker, oferece instalar o app e monitora novas versões/atualizações
 * sem quebrar o layout ou a navegação do usuário.
 */
export default function PwaRegister() {
  const rawPath = usePathname();
  const path = rawPath || "";
  const [evt, setEvt] = useState<Prompt | null>(null);
  const [ios, setIos] = useState(false);
  const [hidden, setHidden] = useState(true);
  const [late, setLate] = useState(false);

  // Controle de atualização do PWA
  const [updateReady, setUpdateReady] = useState(false);
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    // Em localhost, limpa qualquer service worker antigo para evitar que chunks defasados do Webpack quebrem o layout
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        for (const reg of registrations) {
          reg.unregister();
        }
      });
      if ("caches" in window) {
        caches.keys().then((names) => {
          names.forEach((name) => caches.delete(name));
        });
      }
      return;
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        if (reg.waiting) {
          setWaitingWorker(reg.waiting);
          setUpdateReady(true);
        }

        reg.addEventListener("updatefound", () => {
          const newWorker = reg.installing;
          if (newWorker) {
            newWorker.addEventListener("statechange", () => {
              if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setUpdateReady(true);
              }
            });
          }
        });
      })
      .catch(() => {});

    let refreshing = false;
    const onControllerChange = () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);
    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  useEffect(() => {
    let dismissed = false;
    try {
      dismissed = Date.now() - Number(localStorage.getItem(DISMISS) || 0) < 2 * 864e5;
    } catch {}
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone;
    if (dismissed || standalone) return;
    setHidden(false);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !(window as { MSStream?: unknown }).MSStream);
    const on = (e: Event) => {
      e.preventDefault();
      setEvt(e as Prompt);
    };
    window.addEventListener("beforeinstallprompt", on);
    window.addEventListener("appinstalled", () => setHidden(true));
    const t = setTimeout(() => setLate(true), 2500);
    return () => {
      clearTimeout(t);
      window.removeEventListener("beforeinstallprompt", on);
    };
  }, []);

  const handleApplyUpdate = () => {
    if (waitingWorker) {
      waitingWorker.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
    setUpdateReady(false);
  };

  const close = () => {
    setHidden(true);
    try {
      localStorage.setItem(DISMISS, String(Date.now()));
    } catch {}
  };

  const showInstall = !hidden && (evt || ios || late) && !path.startsWith("/login") && !path.includes("/p/");

  return (
    <>
      {/* Banner discreto de nova versão disponível */}
      {updateReady && (
        <aside className="pwa-update-bar" role="status" aria-live="polite">
          <div className="pwa-update-inner">
            <span className="pwa-update-text">✨ Nova versão disponível</span>
            <button type="button" className="btn primary sm pwa-update-btn" onClick={handleApplyUpdate}>
              Atualizar agora
            </button>
            <button
              type="button"
              className="btn ghost sm pwa-update-close"
              onClick={() => setUpdateReady(false)}
              aria-label="Dispensar aviso"
            >
              ✕
            </button>
          </div>
        </aside>
      )}

      {/* Banner de instalação PWA */}
      {showInstall && (
        <div className="install" role="dialog" aria-label="Instalar o app">
          <img src="/icons/icon-192.png" alt="" width={44} height={44} />
          <div className="it">
            <b>Instale a Vitrine Zap</b>
            <small>
              {evt
                ? "Abra como um app, com avisos de pedidos."
                : ios
                ? "Toque em Compartilhar e depois em “Adicionar à Tela de Início”."
                : "Abra o menu ⋮ do navegador e toque em “Instalar app” ou “Adicionar à tela inicial”."}
            </small>
          </div>
          {evt && (
            <button
              className="btn primary sm"
              onClick={async () => {
                await evt.prompt();
                await evt.userChoice;
                setEvt(null);
                close();
              }}
            >
              Instalar
            </button>
          )}
          <button className="btn ghost sm" onClick={close} aria-label="Agora não">
            ✕
          </button>
        </div>
      )}
    </>
  );
}
