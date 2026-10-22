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
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [target, setTarget] = useState(initialProduct ?? "");
  const [pending, start] = useTransition();
  const here = typeof location === "undefined" ? "/painel" : location.pathname;

  useEffect(() => {
    fetch("/api/drive/token").then((r) => setConnected(r.ok));
  }, []);

  const loadPicker = () => gapi.load("picker", () => setReady(true));

  const [info, setInfo] = useState("");

  async function openPicker(kind: "photos" | "folder") {
    setErr(""); setInfo("");
    if (!API_KEY || !APP_ID) return setErr("Chave do Google Picker não configurada (NEXT_PUBLIC_GOOGLE_API_KEY / NEXT_PUBLIC_GOOGLE_APP_ID).");
    const r = await fetch("/api/drive/token");
    if (!r.ok) return setConnected(false);
    const { token } = await r.json();
    const b = new google.picker.PickerBuilder()
      .setAppId(APP_ID).setDeveloperKey(API_KEY).setOAuthToken(token).setLocale("pt-BR");
    if (kind === "photos") {
      const view = new google.picker.DocsView(google.picker.ViewId.DOCS_IMAGES)
        .setIncludeFolders(true).setSelectFolderEnabled(false).setMode(google.picker.DocsViewMode.GRID);
      b.setTitle("Escolha as fotos dos produtos").addView(view).addView(new google.picker.DocsUploadView())
        .enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
    } else {
      const view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
        .setIncludeFolders(true).setSelectFolderEnabled(true).setMimeTypes("application/vnd.google-apps.folder");
      b.setTitle("Escolha a pasta com as fotos").addView(view).enableFeature(google.picker.Feature.MULTISELECT_ENABLED);
    }
    b.setCallback(async (d: any) => {
      if (d.action !== google.picker.Action.PICKED) return;
      if (kind === "photos") {
        setSel((m) => { const n = new Map(m); (d.docs as any[]).forEach((x) => n.set(x.id, x.name)); return n; });
        return;
      }
      let total = 0;
      for (const folder of d.docs as any[]) {
        const res = await fetch(`/api/drive/folder?id=${folder.id}`);
        if (!res.ok) { setErr("Não foi possível ler a pasta. Tente escolher as fotos manualmente."); continue; }
        const { files } = (await res.json()) as { files: Picked[] };
        total += files.length;
        setSel((m) => { const n = new Map(m); files.forEach((f) => n.set(f.id, f.name)); return n; });
      }
      if (total) setInfo(`${total} foto(s) encontradas na pasta. Agora escolha como criar os produtos.`);
      else setErr("O Google não liberou o conteúdo desta pasta para o app. Use “Escolher fotos” e, dentro da pasta, selecione todas (Ctrl+A ou Shift+clique).");
    });
    b.build().setVisible(true);
  }

  const files: Picked[] = [...sel].map(([id, name]) => ({ id, name }));
  const drop = (id: string) => setSel((m) => { const n = new Map(m); n.delete(id); return n; });
  const run = (mode: "each" | "group" | "add") =>
    start(async () => {
      const r = await importFiles({ storeId, mode, files, groupName, productId: target, category, tags });
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
      <div className="actions wrapx">
        <button className="btn primary" disabled={!ready || connected === null} onClick={() => openPicker("photos")}>🖼️ Escolher fotos</button>
        <button className="btn" disabled={!ready || connected === null} onClick={() => openPicker("folder")}>📁 Importar pasta inteira</button>
        {sel.size > 0 && <button className="btn ghost" onClick={() => setSel(new Map())}>Limpar seleção</button>}
      </div>
      <small className="muted block">Dica: na janela do Google, use Ctrl+A ou Shift+clique para marcar várias fotos de uma vez.</small>
      {info && <p className="ok">{info}</p>}
      {err && <p className="err">{err}</p>}

      <div className="row2 applyall">
        <label>Categoria dos novos produtos <small>(opcional)</small><input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Ex.: Calçados" /></label>
        <label>Tags dos novos produtos <small>(opcional)</small><input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Masculino, Tênis, Nike" /></label>
      </div>
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
        <button className="btn primary" disabled={!sel.size || pending} onClick={() => run("each")}>{pending ? "Criando…" : `Criar ${sel.size || ""} produto(s), um por foto`}</button>
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
