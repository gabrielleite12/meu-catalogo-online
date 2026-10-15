"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Script from "next/script";
import { importFiles } from "../../actions";
import { imgUrl } from "@/lib/utils";
import LoginButton from "@/app/login/LoginButton";

type Picked = { id: string; name: string };
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const google: any;
declare const gapi: any;

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
const APP_ID = process.env.NEXT_PUBLIC_GOOGLE_APP_ID;

export default function Importer({ storeId, products, used, initialProduct }: {
  storeId: string; products: { id: string; name: string }[]; used: string[]; initialProduct?: string;
}) {
  const router = useRouter();
  const [connected, setConnected] = useState<boolean | null>(null);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<Map<string, string>>(new Map());
  const [groupName, setGroupName] = useState("");
  const [target, setTarget] = useState(initialProduct ?? "");
  const [pending, start] = useTransition();
  const here = typeof location === "undefined" ? "/painel" : location.pathname;

  useEffect(() => {
    fetch("/api/drive/token").then((r) => setConnected(r.ok));
  }, []);

  const loadPicker = () => gapi.load("picker", () => setReady(true));

  async function openPicker() {
    setErr("");
    if (!API_KEY || !APP_ID) return setErr("Chave do Google Picker não configurada (NEXT_PUBLIC_GOOGLE_API_KEY / NEXT_PUBLIC_GOOGLE_APP_ID).");
    const r = await fetch("/api/drive/token");
    if (!r.ok) return setConnected(false);
    const { token } = await r.json();
    const view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
      .setIncludeFolders(true).setSelectFolderEnabled(false).setMode(google.picker.DocsViewMode.GRID);
    new google.picker.PickerBuilder()
      .setAppId(APP_ID).setDeveloperKey(API_KEY).setOAuthToken(token)
      .setLocale("pt-BR").setTitle("Escolha as fotos dos produtos")
      .addView(view).addView(new google.picker.DocsUploadView())
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setCallback((d: any) => {
        if (d.action !== google.picker.Action.PICKED) return;
        setSel((m) => { const n = new Map(m); (d.docs as any[]).forEach((x) => n.set(x.id, x.name)); return n; });
      })
      .build().setVisible(true);
  }

  const files: Picked[] = [...sel].map(([id, name]) => ({ id, name }));
  const drop = (id: string) => setSel((m) => { const n = new Map(m); n.delete(id); return n; });
  const run = (mode: "each" | "group" | "add") =>
    start(async () => {
      const r = await importFiles({ storeId, mode, files, groupName, productId: target });
      if (r.error) return setErr(r.error);
      router.push(`/painel/${storeId}/produtos`);
    });

  if (connected === false) {
    return (
      <div className="card narrow">
        <h3>Conecte seu Google Drive</h3>
        <p className="muted">Você escolhe quais fotos liberar. O app nunca vê o resto do seu Drive e não altera nada.</p>
        <LoginButton drive next={here} />
      </div>
    );
  }

  return (
    <>
      <Script src="https://apis.google.com/js/api.js" onLoad={loadPicker} />
      <button className="btn primary" disabled={!ready || connected === null} onClick={openPicker}>
        📁 Escolher fotos no Google Drive
      </button>
      {err && <p className="err">{err}</p>}

      <div className="grid pick">
        {files.map((f) => (
          <button key={f.id} className="tile on" onClick={() => drop(f.id)} title="Clique para remover da seleção">
            <img src={imgUrl(f.id) + "?s=320"} alt={f.name} loading="lazy" />
            {used.includes(f.id) && <span className="badge">no catálogo</span>}
            <span className="cap">{f.name}</span>
          </button>
        ))}
      </div>
      {!files.length && <p className="muted">Nenhuma foto escolhida ainda.</p>}

      <div className="dock">
        <strong>{sel.size} selecionada{sel.size === 1 ? "" : "s"}</strong>
        <button className="btn primary" disabled={!sel.size || pending} onClick={() => run("each")}>Um produto por foto</button>
        <span className="group">
          <input placeholder="Nome do produto" value={groupName} onChange={(e) => setGroupName(e.target.value)} />
          <button className="btn" disabled={!sel.size || pending} onClick={() => run("group")}>Juntar em um produto</button>
        </span>
        <span className="group">
          <select value={target} onChange={(e) => setTarget(e.target.value)}>
            <option value="">Adicionar a…</option>
            {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <button className="btn" disabled={!sel.size || !target || pending} onClick={() => run("add")}>Adicionar</button>
        </span>
      </div>
    </>
  );
}
