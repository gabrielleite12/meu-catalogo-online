"use client";
import Link from "next/link";
import { useActionState, useMemo, useState, useTransition } from "react";
import { bulkProducts, deleteProduct, duplicateProduct, removeImage, updateProduct } from "../../actions";
import { imgUrl, type Product, type Variant } from "@/lib/utils";

type Row = { name: string; sku: string; price: string; stock: string; id?: string };
const toRow = (v: Variant): Row => ({ id: v.id, name: v.name, sku: v.sku ?? "", price: v.price != null ? String(v.price).replace(".", ",") : "", stock: v.stock != null ? String(v.stock) : "" });
const csv = (t: string) => t.split(",").map((x) => x.trim()).filter(Boolean);

function Editor({ p, rating }: { p: Product; rating?: { avg_rating: number; total: number } }) {
  const [rows, setRows] = useState<Row[]>([...p.product_variants].sort((a, b) => a.position - b.position).map(toRow));
  const [sizes, setSizes] = useState("");
  const [colors, setColors] = useState("");
  const [track, setTrack] = useState(p.track_stock);
  const [st, act, saving] = useActionState(updateProduct, {});
  const set = (i: number, k: keyof Row, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  function generate() {
    const S = csv(sizes), C = csv(colors);
    const names = S.length && C.length ? S.flatMap((s) => C.map((c) => `${s} / ${c}`)) : [...S, ...C];
    const have = new Set(rows.map((r) => r.name.toLowerCase()));
    setRows((r) => [...r, ...names.filter((n) => !have.has(n.toLowerCase())).map((name) => ({ name, sku: "", price: "", stock: "" }))]);
    setSizes(""); setColors("");
  }

  return (
    <form action={act} className="form">
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />
      {rating && <p className="muted">★ {rating.avg_rating} ({rating.total} avaliações)</p>}
      <div className="row2">
        <label>Nome<input name="name" defaultValue={p.name} /></label>
        <label>SKU / código<input name="sku" defaultValue={p.sku ?? ""} placeholder="Opcional" /></label>
      </div>
      <div className="row2">
        <label>Preço (opcional)<input name="price" defaultValue={p.price ?? ""} inputMode="decimal" placeholder="0,00" /></label>
        {rows.length === 0 && (
          <label>Estoque
            <div className="inline">
              <input type="checkbox" name="track_stock" checked={track} onChange={(e) => setTrack(e.target.checked)} title="Controlar estoque" />
              <input name="stock" type="number" min={0} defaultValue={p.stock ?? 0} disabled={!track} />
            </div>
          </label>
        )}
      </div>
      <label>Descrição<textarea name="description" rows={2} defaultValue={p.description ?? ""} /></label>

      <fieldset className="variants">
        <legend>Variações (tamanho, cor…) <small className="muted">opcional</small></legend>
        <div className="gen">
          <input placeholder="Tamanhos: P, M, G" value={sizes} onChange={(e) => setSizes(e.target.value)} />
          <input placeholder="Cores: Preto, Azul" value={colors} onChange={(e) => setColors(e.target.value)} />
          <button type="button" className="btn sm" onClick={generate} disabled={!sizes.trim() && !colors.trim()}>Gerar combinações</button>
        </div>
        {rows.length > 0 && (
          <div className="vtable">
            <div className="vhead"><span>Variação</span><span>SKU</span><span>Preço</span><span>Estoque</span><span /></div>
            {rows.map((r, i) => (
              <div className="vrow" key={r.id ?? i}>
                <input value={r.name} onChange={(e) => set(i, "name", e.target.value)} placeholder="M / Azul" />
                <input value={r.sku} onChange={(e) => set(i, "sku", e.target.value)} placeholder="SKU" />
                <input value={r.price} onChange={(e) => set(i, "price", e.target.value)} placeholder="= produto" inputMode="decimal" />
                <input value={r.stock} onChange={(e) => set(i, "stock", e.target.value)} placeholder="sem controle" inputMode="numeric" />
                <button type="button" className="x" onClick={() => setRows((a) => a.filter((_, j) => j !== i))} aria-label="Remover variação">×</button>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="link" onClick={() => setRows((r) => [...r, { name: "", sku: "", price: "", stock: "" }])}>+ Adicionar variação manualmente</button>
        {rows.length > 0 && <small className="muted block">Com variações, o estoque é por variação. Deixe vazio para não controlar.</small>}
      </fieldset>

      {st.error && <p className="err">{st.error}</p>}
      {st.ok && !saving && <p className="ok">✓ Salvo</p>}
      <div className="between">
        <label className="check"><input type="checkbox" name="active" defaultChecked={p.active} /> Visível no catálogo</label>
        <div className="actions">
          <button type="submit" className="btn primary" disabled={saving}>{saving ? "Salvando…" : "Salvar"}</button>
          <button className="btn" formAction={duplicateProduct} formNoValidate
            onClick={(e) => { if (!confirm(`Criar uma cópia oculta de "${p.name}"?`)) e.preventDefault(); }}>Duplicar</button>
          <button className="btn danger" formAction={deleteProduct} formNoValidate
            onClick={(e) => { if (!confirm(`Excluir "${p.name}"?`)) e.preventDefault(); }}>Excluir</button>
        </div>
      </div>
    </form>
  );
}

export default function ProductList({ products, storeId, ratings }: {
  products: Product[]; storeId: string; ratings: Record<string, { avg_rating: number; total: number }>;
}) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [pending, start] = useTransition();

  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const list = useMemo(() => products.filter((p) => norm(p.name + " " + (p.sku ?? "")).includes(norm(q))), [products, q]);
  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const all = list.length > 0 && list.every((p) => sel.has(p.id));
  const bulk = (action: "delete" | "hide" | "show") => {
    if (action === "delete" && !confirm(`Excluir ${sel.size} produto(s)? Isso não pode ser desfeito.`)) return;
    start(async () => { await bulkProducts({ ids: [...sel], action }); setSel(new Set()); });
  };

  const stockLabel = (p: Product) => {
    if (p.product_variants.length) {
      const total = p.product_variants.reduce((a, v) => a + (v.stock ?? 0), 0);
      const tracked = p.product_variants.some((v) => v.stock != null);
      return `${p.product_variants.length} variações${tracked ? ` · ${total} un.` : ""}`;
    }
    return p.track_stock ? `${p.stock ?? 0} un.` : "sem controle";
  };

  return (
    <>
      <div className="toolbar">
        <input placeholder="Buscar por nome ou SKU…" value={q} onChange={(e) => setQ(e.target.value)} />
        <label className="check"><input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(list.map((p) => p.id)))} /> Selecionar todos</label>
      </div>
      {sel.size > 0 && (
        <div className="bulkbar">
          <b>{sel.size} selecionado(s)</b>
          <button className="btn sm" disabled={pending} onClick={() => bulk("show")}>Mostrar</button>
          <button className="btn sm" disabled={pending} onClick={() => bulk("hide")}>Ocultar</button>
          <button className="btn sm danger" disabled={pending} onClick={() => bulk("delete")}>Excluir</button>
        </div>
      )}
      {!list.length && <p className="muted">Nenhum produto encontrado.</p>}
      <div className="stack">
        {list.map((p) => {
          const imgs = [...p.product_images].sort((a, b) => a.position - b.position);
          const isOpen = open === p.id;
          return (
            <div className={"card prod" + (p.active ? "" : " off")} key={p.id}>
              <div className="phead">
                <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Selecionar ${p.name}`} />
                <button className="pmain" onClick={() => setOpen(isOpen ? null : p.id)}>
                  <span className="pthumb">{imgs[0] ? <img src={imgUrl(imgs[0].drive_file_id) + "?s=160"} alt="" loading="lazy" /> : null}</span>
                  <span className="pinfo">
                    <b>{p.name}</b>
                    <small className="muted">{[p.sku && `SKU ${p.sku}`, p.price != null && `R$ ${Number(p.price).toFixed(2).replace(".", ",")}`, stockLabel(p), !p.active && "oculto"].filter(Boolean).join(" · ")}</small>
                  </span>
                  <span className="chev">{isOpen ? "▲" : "▼"}</span>
                </button>
              </div>
              {isOpen && (
                <div className="pbody">
                  <div className="thumbs">
                    {imgs.map((im) => (
                      <form action={removeImage} key={im.id} className="thumb">
                        <input type="hidden" name="id" value={im.id} />
                        <img src={imgUrl(im.drive_file_id) + "?s=240"} alt="" loading="lazy" />
                        <button title="Remover foto" aria-label="Remover foto">×</button>
                      </form>
                    ))}
                    <Link className="thumb add" href={`/painel/${storeId}/importar?produto=${p.id}`} title="Adicionar fotos">+</Link>
                  </div>
                  <Editor p={p} rating={ratings[p.id]} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
