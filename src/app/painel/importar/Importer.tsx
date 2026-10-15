"use client";
import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { importFiles } from "../actions";
import { imgUrl } from "@/lib/utils";

type Item = { id: string; name: string; mimeType: string };
const FOLDER = "application/vnd.google-apps.folder";

export default function Importer({ products, used, initialProduct }: {
  products: { id: string; name: string }[]; used: string[]; initialProduct?: string;
}) {
  const router = useRouter();
  const [trail, setTrail] = useState<{ id: string; name: string }[]>([{ id: "root", name: "Meu Drive" }]);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [sel, setSel] = useState<Map<string, string>>(new Map());
  const [groupName, setGroupName] = useState("");
  const [target, setTarget] = useState(initialProduct ?? "");
  const [pending, start] = useTransition();
  const cur = trail[trail.length - 1];

  useEffect(() => {
    setLoading(true); setErr("");
    fetch(`/api/drive?folder=${cur.id}`)
      .then(async (r) => {
        if (r.status === 424) throw new Error("Reconecte o Google: saia e entre novamente para liberar o acesso ao Drive.");
        if (!r.ok) throw new Error("Não foi possível ler o Drive.");
        return r.json();
      })
      .then((j) => setItems(j.items))
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false));
  }, [cur.id]);

  const folders = items.filter((i) => i.mimeType === FOLDER);
  const images = items.filter((i) => i.mimeType !== FOLDER);
  const toggle = (i: Item) => setSel((m) => { const n = new Map(m); n.has(i.id) ? n.delete(i.id) : n.set(i.id, i.name); return n; });
  const selectAll = () => setSel((m) => { const n = new Map(m); images.forEach((i) => n.set(i.id, i.name)); return n; });
  const files = [...sel].map(([id, name]) => ({ id, name }));

  const run = (mode: "each" | "group" | "add") =>
    start(async () => {
      const r = await importFiles({ mode, files, groupName, productId: target });
      if (r.error) return setErr(r.error);
      router.push("/painel/produtos");
    });

  return (
    <>
      <div className="crumbs">
        {trail.map((t, i) => (
          <button key={t.id} className="link" onClick={() => setTrail(trail.slice(0, i + 1))}>{t.name}{i < trail.length - 1 && " /"}</button>
        ))}
      </div>
      {err && <p className="err">{err}</p>}
      {loading ? <p className="muted">Carregando…</p> : (
        <>
          <div className="folders">
            {folders.map((f) => (
              <button key={f.id} className="folder" onClick={() => setTrail([...trail, { id: f.id, name: f.name }])}>📁 {f.name}</button>
            ))}
          </div>
          {images.length > 0 && <button className="link" onClick={selectAll}>Selecionar todas desta pasta</button>}
          <div className="grid pick">
            {images.map((i) => (
              <button key={i.id} className={"tile" + (sel.has(i.id) ? " on" : "")} onClick={() => toggle(i)}>
                <img src={imgUrl(i.id) + "?s=320"} alt={i.name} loading="lazy" />
                {used.includes(i.id) && <span className="badge">no catálogo</span>}
                <span className="cap">{i.name}</span>
              </button>
            ))}
          </div>
          {!folders.length && !images.length && <p className="muted">Nada por aqui — só mostramos pastas e imagens.</p>}
        </>
      )}

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
