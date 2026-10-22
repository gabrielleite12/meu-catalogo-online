"use client";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { bulkProducts, copyVariants, mergeProducts, deleteProduct, duplicateProduct, removeImage, toggleProduct, updateProduct } from "../../actions";
import { csvList, imgUrl, type Product, type Template, type Variant } from "@/lib/utils";
import SubmitButton from "@/components/SubmitButton";

type Row = { name: string; sku: string; barcode: string; price: string; stock: string; image: string; id?: string };
type Group = { name: string; options: string };
const blank = (name = ""): Row => ({ name, sku: "", barcode: "", price: "", stock: "", image: "" });
const toRow = (v: Variant): Row => ({ id: v.id, name: v.name, sku: v.sku ?? "", barcode: v.barcode ?? "", price: v.price != null ? String(v.price).replace(".", ",") : "", stock: v.stock != null ? String(v.stock) : "", image: v.image_file_id ?? "" });
const SUGGEST_TAGS = ["Masculino", "Feminino", "Unissex", "Infantil", "Promoção", "Novidade"];

/** Estoque total e situação do produto (considera variações). */
function stockInfo(p: Product) {
  const vs = p.product_variants.filter((v) => v.active);
  if (vs.length) {
    const tracked = vs.every((v) => v.stock != null);
    const qty = vs.reduce((a, v) => a + (v.stock ?? 0), 0);
    return { tracked, qty, label: `${vs.length} variações${tracked ? ` · ${qty} un.` : ""}` };
  }
  return { tracked: p.track_stock, qty: p.stock ?? 0, label: p.track_stock ? `${p.stock ?? 0} un.` : "sem controle" };
}
const isOut = (p: Product) => { const s = stockInfo(p); return s.tracked && s.qty <= 0; };
const isLow = (p: Product) => { const s = stockInfo(p); return s.tracked && s.qty > 0 && s.qty <= (p.low_stock_alert ?? 0); };

function Editor({ p, rating, templates, categories }: {
  p: Product; rating?: { avg_rating: number; total: number }; templates: Template[]; categories: string[];
}) {
  const [rows, setRows] = useState<Row[]>([...p.product_variants].sort((a, b) => a.position - b.position).map(toRow));
  const [groups, setGroups] = useState<Group[]>([{ name: "Tamanho", options: "" }, { name: "Cor", options: "" }]);
  const [track, setTrack] = useState(p.track_stock);
  const gKey = `vgroups:${p.store_id}`;
  useEffect(() => { try { const g = JSON.parse(localStorage.getItem(gKey) || "null"); if (Array.isArray(g) && g.length) setGroups(g); } catch {} }, [gKey]);
  useEffect(() => { try { localStorage.setItem(gKey, JSON.stringify(groups)); } catch {} }, [groups, gKey]);
  const [st, act, saving] = useActionState(updateProduct, {});
  const [busy, setBusy] = useState<"" | "dup" | "del">("");
  const set = (i: number, k: keyof Row, v: string) => setRows((r) => r.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const setG = (i: number, k: keyof Group, v: string) => setGroups((g) => g.map((x, j) => (j === i ? { ...x, [k]: v } : x)));

  function generate() {
    const lists = groups.map((g) => csvList(g.options)).filter((l) => l.length);
    if (!lists.length) return;
    const combos = lists.reduce<string[][]>((acc, l) => acc.flatMap((a) => l.map((o) => [...a, o])), [[]]).map((c) => c.join(" / "));
    const have = new Set(rows.map((r) => r.name.toLowerCase()));
    setRows((r) => [...r, ...combos.filter((n) => !have.has(n.toLowerCase())).map((n) => blank(n))]);
  }

  // Grade: colunas = 1º atributo (ex.: tamanho), linhas = 2º atributo (ex.: cor). Célula vazia = combinação não existe.
  const g1 = csvList(groups[0]?.options ?? "");
  const g2 = csvList(groups[1]?.options ?? "");
  const cols = g1.length ? g1 : g2;
  const lines = g1.length && g2.length ? g2 : [""];
  const comboName = (c: string, l: string) => (g1.length && g2.length ? `${c} / ${l}` : c);
  const cell = (name: string) => { const r = rows.find((x) => x.name.toLowerCase() === name.toLowerCase()); return r ? (r.stock === "" ? "∞" : r.stock) : ""; };
  function setCell(name: string, v: string) {
    const t = v.trim();
    setRows((rs) => {
      const i = rs.findIndex((x) => x.name.toLowerCase() === name.toLowerCase());
      if (t === "") return i >= 0 ? rs.filter((_, j) => j !== i) : rs;
      const stock = /^\d+$/.test(t) ? t : "";
      if (i >= 0) return rs.map((x, j) => (j === i ? { ...x, stock } : x));
      return [...rs, { ...blank(name), stock }];
    });
  }

  return (
    <form action={act} className="form">
      <input type="hidden" name="id" value={p.id} />
      <input type="hidden" name="variants" value={JSON.stringify(rows)} />
      {rating && <p className="muted">★ {rating.avg_rating} ({rating.total} avaliações)</p>}
      <div className="row2">
        <label>Nome<input name="name" defaultValue={p.name} /></label>
        <label>SKU / código interno<input name="sku" defaultValue={p.sku ?? ""} placeholder="Opcional" /></label>
      </div>
      <div className="row2">
        <label>Categoria
          <input name="category" list={`cats-${p.id}`} defaultValue={p.category ?? ""} placeholder="Ex.: Camisetas, Calçados…" />
          <datalist id={`cats-${p.id}`}>{categories.map((c) => <option key={c} value={c} />)}</datalist>
        </label>
        <label>Tags <small>separe por vírgula: gênero, tipo, marca, cor…</small>
          <input name="tags" list={`tags-${p.id}`} defaultValue={p.tags.join(", ")} placeholder="Masculino, Camiseta, Nike" />
          <datalist id={`tags-${p.id}`}>{SUGGEST_TAGS.map((t) => <option key={t} value={t} />)}</datalist>
        </label>
      </div>
      <div className="row2">
        <label>Preço (opcional)<input name="price" defaultValue={p.price ?? ""} inputMode="decimal" placeholder="0,00" /></label>
        <label>Código de barras<input name="barcode" defaultValue={p.barcode ?? ""} placeholder="Opcional" inputMode="numeric" /></label>
      </div>
      <label>Descrição<textarea name="description" rows={2} defaultValue={p.description ?? ""} /></label>

      <fieldset className="variants">
        <legend>Estoque</legend>
        {rows.length === 0 ? (
          <div className="row2">
            <label className="check"><input type="checkbox" name="track_stock" checked={track} onChange={(e) => setTrack(e.target.checked)} /> Controlar estoque</label>
            <label>Quantidade<input name="stock" type="number" min={0} defaultValue={p.stock ?? 0} disabled={!track} /></label>
          </div>
        ) : <small className="muted">Este produto tem variações: o estoque é controlado em cada variação (deixe vazio para não controlar).</small>}
        <div className="row2">
          <label>Avisar quando restar até <small>unidades (opcional)</small><input name="low_stock_alert" type="number" min={0} defaultValue={p.low_stock_alert ?? ""} placeholder="Ex.: 3" /></label>
          <label className="check"><input type="checkbox" name="hide_when_out" defaultChecked={p.hide_when_out} /> Ocultar sozinho quando o estoque acabar (e reexibir ao repor)</label>
        </div>
      </fieldset>

      <fieldset className="variants">
        <legend>Variações (tamanho, cor…) <small className="muted">opcional</small></legend>
        <div className="groups">
          {groups.map((g, i) => (
            <div className="grow" key={i}>
              <select value="" onChange={(e) => { const t = templates.find((x) => x.id === e.target.value); if (t) setGroups((a) => a.map((x, j) => (j === i ? { name: t.name, options: t.options.join(", ") } : x))); }}>
                <option value="">Modelo…</option>
                {templates.map((t) => <option key={t.id} value={t.id}>{t.name}{t.store_id ? " ★" : ""}</option>)}
              </select>
              <input value={g.name} onChange={(e) => setG(i, "name", e.target.value)} placeholder="Atributo (Tamanho)" />
              <input value={g.options} onChange={(e) => setG(i, "options", e.target.value)} placeholder="Opções: P, M, G" />
              {groups.length > 1 && <button type="button" className="x" onClick={() => setGroups((a) => a.filter((_, j) => j !== i))} aria-label="Remover atributo">×</button>}
            </div>
          ))}
          <div className="actions wrapx">
            <button type="button" className="link" onClick={() => setGroups((g) => [...g, { name: "", options: "" }])}>+ Atributo</button>
            <button type="button" className="btn sm" onClick={generate} disabled={!groups.some((g) => g.options.trim())} title="Cria todas as combinações de uma vez">Criar todas as combinações</button>
          </div>
        </div>
        {cols.length > 0 && (
          <div className="matrix">
            <small className="muted block">Grade de estoque: digite a quantidade de cada combinação. <b>Deixe vazio se a combinação não existe</b> (ex.: só há M preta). Use ∞ para “existe, sem controle de estoque”.</small>
            <div className="mscroll">
              <table>
                <thead><tr><th>{g1.length && g2.length ? `${groups[1].name || "Linha"} \\ ${groups[0].name || "Coluna"}` : groups[0]?.name || ""}</th>{cols.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                <tbody>
                  {lines.map((l) => (
                    <tr key={l}><th>{l}</th>
                      {cols.map((c) => { const n = comboName(c, l); return <td key={c}><input value={cell(n)} onChange={(e) => setCell(n, e.target.value)} inputMode="numeric" placeholder="—" /></td>; })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        {rows.length > 0 && (
          <div className="vtable">
            <div className="vhead"><span>Variação</span><span>SKU</span><span>Cód. barras</span><span>Preço</span><span>Estoque</span><span>Foto</span><span /></div>
            {rows.map((r, i) => (
              <div className="vrow" key={r.id ?? i}>
                <input value={r.name} onChange={(e) => set(i, "name", e.target.value)} placeholder="M / Azul" />
                <input value={r.sku} onChange={(e) => set(i, "sku", e.target.value)} placeholder="SKU" />
                <input value={r.barcode} onChange={(e) => set(i, "barcode", e.target.value)} placeholder="EAN" inputMode="numeric" />
                <input value={r.price} onChange={(e) => set(i, "price", e.target.value)} placeholder="= produto" inputMode="decimal" />
                <input value={r.stock} onChange={(e) => set(i, "stock", e.target.value)} placeholder="sem controle" inputMode="numeric" />
                <span className="vimg">
                  {r.image && <img src={imgUrl(r.image) + "?s=80"} alt="" />}
                  <select value={r.image} onChange={(e) => set(i, "image", e.target.value)} aria-label="Foto da variação">
                    <option value="">—</option>
                    {[...p.product_images].sort((a, b) => a.position - b.position).map((im, k) => <option key={im.id} value={im.drive_file_id}>Foto {k + 1}</option>)}
                  </select>
                </span>
                <button type="button" className="x" onClick={() => setRows((a) => a.filter((_, j) => j !== i))} aria-label="Remover variação">×</button>
              </div>
            ))}
          </div>
        )}
        <button type="button" className="link" onClick={() => setRows((r) => [...r, blank()])}>+ Adicionar variação manualmente</button>
        <small className="muted block">Os atributos acima ficam salvos para os próximos produtos: você não precisa digitar de novo.</small>
      </fieldset>

      {st.error && <p className="err">{st.error}</p>}
      {st.ok && !saving && <p className="ok">✓ Salvo</p>}
      {p.auto_hidden && <p className="muted">⚠ Este produto foi ocultado automaticamente por falta de estoque.</p>}
      <div className="between">
        <label className="check"><input type="checkbox" name="active" defaultChecked={p.active} /> Visível no catálogo</label>
        <div className="actions">
          <button type="submit" className="btn primary" disabled={saving || !!busy}>{saving ? "Salvando…" : "Salvar"}</button>
          <button className="btn" formAction={duplicateProduct} formNoValidate disabled={!!busy || saving}
            onClick={(e) => { if (!confirm(`Criar uma cópia oculta de "${p.name}"?`)) e.preventDefault(); else setBusy("dup"); }}>{busy === "dup" ? "Duplicando…" : "Duplicar"}</button>
          <button className="btn danger" formAction={deleteProduct} formNoValidate disabled={!!busy || saving}
            onClick={(e) => { if (!confirm(`Excluir "${p.name}"?`)) e.preventDefault(); else setBusy("del"); }}>{busy === "del" ? "Excluindo…" : "Excluir"}</button>
        </div>
      </div>
    </form>
  );
}

type Filter = "todos" | "visiveis" | "ocultos" | "sem" | "baixo";

export default function ProductList({ products, storeId, ratings, templates }: {
  products: Product[]; storeId: string; ratings: Record<string, { avg_rating: number; total: number }>; templates: Template[];
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("todos");
  const [cat, setCat] = useState("");
  const [tag, setTag] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [bulkVal, setBulkVal] = useState("");
  const [pending, start] = useTransition();

  const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean) as string[])].sort(), [products]);
  const tags = useMemo(() => [...new Set(products.flatMap((p) => p.tags))].sort(), [products]);
  const counts = useMemo(() => ({
    todos: products.length, visiveis: products.filter((p) => p.active).length, ocultos: products.filter((p) => !p.active).length,
    sem: products.filter(isOut).length, baixo: products.filter(isLow).length,
  }), [products]);

  const list = useMemo(() => products.filter((p) => {
    const hay = norm([p.name, p.sku, p.barcode, p.category, ...p.tags, ...p.product_variants.flatMap((v) => [v.sku, v.barcode])].filter(Boolean).join(" "));
    if (q && !hay.includes(norm(q))) return false;
    if (cat && p.category !== cat) return false;
    if (tag && !p.tags.includes(tag)) return false;
    if (filter === "visiveis") return p.active;
    if (filter === "ocultos") return !p.active;
    if (filter === "sem") return isOut(p);
    if (filter === "baixo") return isLow(p);
    return true;
  }), [products, q, cat, tag, filter]);

  const toggle = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const all = list.length > 0 && list.every((p) => sel.has(p.id));
  const bulk = (action: "delete" | "hide" | "show" | "category" | "tags_add", value?: string) => {
    if (action === "delete" && !confirm(`Excluir ${sel.size} produto(s)? Isso não pode ser desfeito.`)) return;
    start(async () => { await bulkProducts({ ids: [...sel], action, value }); setSel(new Set()); setBulkVal(""); });
  };

  const [msg, setMsg] = useState("");
  const ordered = () => list.filter((p) => sel.has(p.id));
  const merge = () => {
    const o = ordered();
    if (!confirm(`Juntar ${o.length} produtos em "${o[0].name}"?\n\nAs fotos dos outros serão movidas para ele e os outros produtos serão EXCLUÍDOS (com suas variações).`)) return;
    start(async () => { const r = await mergeProducts({ ids: o.map((p) => p.id) }); setMsg(r.error ?? ""); setSel(new Set()); });
  };
  const copyVars = () => {
    const o = ordered();
    if (!o[0].product_variants.length) return setMsg(`"${o[0].name}" (o primeiro da lista) não tem variações para copiar.`);
    if (!confirm(`Copiar as variações de "${o[0].name}" para ${o.length - 1} produto(s)? As variações atuais deles serão substituídas (o estoque fica sem controle até você preencher).`)) return;
    start(async () => { const r = await copyVariants({ sourceId: o[0].id, targetIds: o.slice(1).map((p) => p.id) }); setMsg(r.error ?? "Variações copiadas."); setSel(new Set()); });
  };

  const chips: [Filter, string][] = [["todos", "Todos"], ["visiveis", "Visíveis"], ["ocultos", "Ocultos"], ["sem", "Sem estoque"], ["baixo", "Estoque baixo"]];

  return (
    <>
      <div className="chipbar">
        {chips.map(([k, label]) => (
          <button key={k} className={"fchip" + (filter === k ? " on" : "")} onClick={() => setFilter(k)}>{label} <b>{counts[k]}</b></button>
        ))}
      </div>
      <div className="toolbar">
        <input placeholder="Buscar nome, SKU, código de barras, categoria ou tag…" value={q} onChange={(e) => setQ(e.target.value)} />
        {categories.length > 0 && <select value={cat} onChange={(e) => setCat(e.target.value)}><option value="">Todas as categorias</option>{categories.map((c) => <option key={c}>{c}</option>)}</select>}
        {tags.length > 0 && <select value={tag} onChange={(e) => setTag(e.target.value)}><option value="">Todas as tags</option>{tags.map((t) => <option key={t}>{t}</option>)}</select>}
        <label className="check"><input type="checkbox" checked={all} onChange={() => setSel(all ? new Set() : new Set(list.map((p) => p.id)))} /> Selecionar todos</label>
      </div>
      {sel.size > 0 && (
        <div className="bulkbar">
          <b>{sel.size} selecionado(s)</b>
          {pending && <span className="spin" />}
          <button className="btn sm" disabled={pending} onClick={() => bulk("show")}>Mostrar</button>
          <button className="btn sm" disabled={pending} onClick={() => bulk("hide")}>Ocultar</button>
          <input value={bulkVal} onChange={(e) => setBulkVal(e.target.value)} placeholder="Categoria ou tags" />
          <button className="btn sm" disabled={pending || !bulkVal.trim()} onClick={() => bulk("category", bulkVal)}>Definir categoria</button>
          <button className="btn sm" disabled={pending || !bulkVal.trim()} onClick={() => bulk("tags_add", bulkVal)}>Adicionar tags</button>
          <button className="btn sm" disabled={pending || sel.size < 2} onClick={() => merge()}
            title="As fotos dos demais vão para o primeiro da lista e os demais são removidos">Juntar em um produto</button>
          <button className="btn sm" disabled={pending || sel.size < 2} onClick={() => copyVars()}
            title="Copia as variações do primeiro da lista para os outros selecionados">Copiar variações do 1º</button>
          <button className="btn sm danger" disabled={pending} onClick={() => bulk("delete")}>Excluir</button>
          {msg && <span className="muted">{msg}</span>}
        </div>
      )}
      {!list.length && <p className="muted">Nenhum produto encontrado com esses filtros.</p>}
      <div className="stack">
        {list.map((p) => {
          const imgs = [...p.product_images].sort((a, b) => a.position - b.position);
          const isOpen = open === p.id;
          const si = stockInfo(p);
          return (
            <div className={"card prod" + (p.active ? "" : " off")} key={p.id}>
              <div className="phead">
                <input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} aria-label={`Selecionar ${p.name}`} />
                <button className="pmain" onClick={() => setOpen(isOpen ? null : p.id)}>
                  <span className="pthumb">{imgs[0] ? <img src={imgUrl(imgs[0].drive_file_id) + "?s=160"} alt="" loading="lazy" /> : null}</span>
                  <span className="pinfo">
                    <b>{p.name}</b>
                    <small className="muted">{[p.category, p.sku && `SKU ${p.sku}`, p.price != null && `R$ ${Number(p.price).toFixed(2).replace(".", ",")}`, si.label].filter(Boolean).join(" · ")}</small>
                    <span className="badges">
                      {!p.active && <i className="bd off">{p.auto_hidden ? "oculto · sem estoque" : "oculto"}</i>}
                      {isOut(p) && <i className="bd out">sem estoque</i>}
                      {isLow(p) && <i className="bd low">estoque baixo</i>}
                      {p.tags.map((t) => <i className="bd" key={t}>{t}</i>)}
                    </span>
                  </span>
                  <span className="chev">{isOpen ? "▲" : "▼"}</span>
                </button>
                <form action={toggleProduct} className="qa">
                  <input type="hidden" name="id" value={p.id} />
                  <input type="hidden" name="active" value={String(!p.active)} />
                  <SubmitButton className="btn sm" pendingText="…">{p.active ? "Ocultar" : "Mostrar"}</SubmitButton>
                </form>
                <form action={deleteProduct} className="qa" onSubmit={(e) => { if (!confirm(`Excluir "${p.name}"?`)) e.preventDefault(); }}>
                  <input type="hidden" name="id" value={p.id} />
                  <SubmitButton className="btn sm danger" pendingText="…">🗑</SubmitButton>
                </form>
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
                  <Editor p={p} rating={ratings[p.id]} templates={templates} categories={categories} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
