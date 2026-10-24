"use client";
import { useEffect, useState } from "react";
import { savePushSubscription, removePushSubscription } from "@/app/push/actions";

const KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
type State = "loading" | "unsupported" | "needs-install" | "denied" | "off" | "on";

function keyBytes(b64: string) {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** Liga/desliga os avisos push neste aparelho. `card` = chamada em destaque; `menu` = item de menu. */
export default function NotifyButton({ variant = "menu", hint }: { variant?: "menu" | "card"; hint?: string }) {
  const [state, setState] = useState<State>("loading");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      if (!KEY) return setState("unsupported");
      const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
      const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone;
      if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) return setState(ios && !standalone ? "needs-install" : "unsupported");
      if (Notification.permission === "denied") return setState("denied");
      try {
        const reg = await navigator.serviceWorker.ready;
        setState((await reg.pushManager.getSubscription()) && Notification.permission === "granted" ? "on" : "off");
      } catch { setState("unsupported"); }
    })();
  }, []);

  async function enable() {
    setBusy(true);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") return setState(perm === "denied" ? "denied" : "off");
      const reg = await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(KEY!) });
      const r = await savePushSubscription(sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } });
      setState(r.ok ? "on" : "off");
    } catch { setState("off"); } finally { setBusy(false); }
  }
  async function disable() {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await removePushSubscription(sub.endpoint); await sub.unsubscribe(); }
      setState("off");
    } finally { setBusy(false); }
  }

  if (state === "loading" || state === "unsupported") return null;
  const msg = state === "denied" ? "Avisos bloqueados — libere nas configurações do navegador." :
    state === "needs-install" ? "No iPhone, instale o app (Compartilhar → Adicionar à Tela de Início) para receber avisos." : null;

  if (variant === "card") {
    if (state === "on") return null;
    return (
      <div className="card notify">
        <div><b>🔔 Ative os avisos</b><br /><span className="muted">{msg ?? hint ?? "Receba um aviso no celular quando algo mudar."}</span></div>
        {!msg && <button className="btn primary sm" disabled={busy} onClick={enable}>{busy ? "Ativando…" : "Ativar avisos"}</button>}
      </div>
    );
  }
  if (msg) return <small className="muted dropnote">{msg}</small>;
  return state === "on"
    ? <button type="button" disabled={busy} onClick={disable}>🔕 Desativar avisos</button>
    : <button type="button" disabled={busy} onClick={enable}>🔔 Ativar avisos</button>;
}
