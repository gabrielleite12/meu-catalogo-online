"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { brl, imgUrl, type Product, type Rating, type Review, type Variant } from "@/lib/utils";
import { Stars } from "@/components/Stars";
import { placeOrder } from "./actions";

type S = { slug: string; name: string; whatsapp: string | null };
type Viewer = { loggedIn: boolean; hasProfile: boolean };

const vars = (p: Product) => p.product_variants.filter((v) => v.active).sort((a, b) => a.position - b.position);
const key = (p: Product, v?: Variant) => `${p.id}|${v?.id ?? ""}`;
const avail = (p: Product, v?: Variant) => (v ? (v.stock == null ? 999 : v.stock) : p.track_stock ? p.stock ?? 0 : 999);
const priceOf = (p: Product, v?: Variant) => (v?.price ?? p.price) as number | null;
const soldOut = (p: Product) => (vars(p).length ? vars(p).every((v) => avail(p, v) <= 0) : avail(p) <= 0);
const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();


const stockText = (v: Variant) => (v.stock == null ? "Disponível" : v.stock > 0 ? `${v.stock} em estoque` : "Esgotado");
const looksNumber = (a: string[]) => a.every((x) => /^\d+([.,]\d+)?$/.test(x));
const looksSize = (a: string[]) => a.every((x) => /^(PP|P|M|G|GG|XG|XGG|U|UNICO|ÚNICO)$/i.test(x));

/** Escolha de opção: número/tamanho × cor, com estoque de cada combinação. */
function Picker({ p, cart, renderQty, onPhoto }: {
  p: Product; cart: Record<string, number>; renderQty: (p: Product, v?: Variant) => React.ReactNode; onPhoto: (id: string | null) => void;
}) {
  const vs = vars(p);
  const parts = vs.map((v) => v.name.split(" / ").map((x) => x.trim()));
  const two = vs.length > 0 && parts.every((a) => a.length === 2);
  const [a, setA] = useState("");
  const [b, setB] = useState("");

  const aVals = [...new Set(parts.map((x) => x[0]))];
  const bVals = [...new Set(parts.map((x) => x[1]))];
  const find = (x: string, y: string) => vs.find((v, i) => parts[i][0] === x && parts[i][1] === y);
  const aLabel = looksNumber(aVals) ? "Número" : looksSize(aVals) ? "Tamanho" : "Opção";
  const bLabel = "Cor";
  const chosen = two && a && b ? find(a, b) : undefined;
  const inCart = Object.entries(cart).reduce((n, [k, q]) => (k.startsWith(p.id + "|") ? n + q : n), 0);

  const list = (
    <div className="vlist">
      {vs.map((v) => (
        <div className="line" key={v.id}>
          {v.image_file_id && <button className="vthumb" onClick={() => onPhoto(v.image_file_id)} aria-label={`Ver foto ${v.name}`}><img src={imgUrl(v.image_file_id) + "?s=120"} alt="" /></button>}
          <span onClick={() => v.image_file_id && onPhoto(v.image_file_id)}><b>{v.name}</b><br /><small className="muted">{priceOf(p, v) != null ? brl(priceOf(p, v)!) : "Sob consulta"}{v.sku && ` · ${v.sku}`} · {stockText(v)}</small></span>
          {renderQty(p, v)}
        </div>
      ))}
    </div>
  );
  if (!two) return list;

  return (
    <div className="picker">
      <div className="pk">
        <b>{bLabel}</b>
        <div className="opts">
          {bVals.map((y) => {
            const any = vs.some((v, i) => parts[i][1] === y && avail(p, v) > 0 && (!a || parts[i][0] === a));
            return <button key={y} className={"opt" + (b === y ? " on" : "") + (any ? "" : " out")} onClick={() => { setB(b === y ? "" : y); const v = a && find(a, y); onPhoto((v && v.image_file_id) || vs.find((_, i) => parts[i][1] === y && _.image_file_id)?.image_file_id || null); }}>{y}</button>;
          })}
        </div>
      </div>
      <div className="pk">
        <b>{aLabel}</b>
        <div className="opts">
          {aVals.map((x) => {
            const any = vs.some((v, i) => parts[i][0] === x && avail(p, v) > 0 && (!b || parts[i][1] === b));
            const exists = vs.some((_, i) => parts[i][0] === x && (!b || parts[i][1] === b));
            return <button key={x} disabled={!exists} className={"opt" + (a === x ? " on" : "") + (any ? "" : " out")} onClick={() => setA(a === x ? "" : x)}>{x}</button>;
          })}
        </div>
      </div>

      <div className="pkresult">
        {chosen ? (
          <div className="between">
            <span><b>{chosen.name}</b><br /><small className="muted">{priceOf(p, chosen) != null ? brl(priceOf(p, chosen)!) : "Sob consulta"} · {stockText(chosen)}</small></span>
            {renderQty(p, chosen)}
          </div>
        ) : <small className="muted">Escolha {two ? `${bLabel.toLowerCase()} e ${aLabel.toLowerCase()}` : "uma opção"} para adicionar ao pedido.</small>}
        {inCart > 0 && <small className="ok">🛒 {inCart} item(ns) deste produto no pedido</small>}
      </div>

      <div className="avail">
        <b>Disponibilidade</b>
        {bVals.map((y) => (
          <div key={y} className="arow"><span className="ac">{y}</span>
            <span className="an">{aVals.map((x) => { const v = find(x, y); return v ? <i key={x} className={avail(p, v) > 0 ? "" : "o"}>{x}{v.stock != null && <em>: {v.stock > 0 ? v.stock : "esgotado"}</em>}</i> : null; })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function priceLabel(p: Product) {
  const vs = vars(p);
  const prices = (vs.length ? vs.map((v) => priceOf(p, v)) : [p.price]).filter((x): x is number => x != null);
  if (!prices.length) return "Sob consulta";
  const min = Math.min(...prices), max = Math.max(...prices);
  return min === max ? brl(min) : `a partir de ${brl(min)}`;
}

export default function Catalog({ store, products, ratings, reviews, viewer }: {
  store: S; products: Product[]; ratings: Record<string, Rating>; reviews: Record<string, Review[]>; viewer: Viewer;
}) {
  const storageKey = `cart2:${store.slug}`;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [obs, setObs] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [zoom, setZoom] = useState<Product | null>(null);
  const [hero, setHero] = useState<string | null>(null);
  const [cat, setCat] = useState("");
  const [tag, setTag] = useState("");
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean) as string[])].sort(), [products]);
  const tags = useMemo(() => [...new Set(products.flatMap((p) => p.tags))].sort(), [products]);

  useEffect(() => { try { setCart(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch {} }, [storageKey]);
  useEffect(() => { try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch {} }, [cart, storageKey]);

  const setQty = (p: Product, v: Variant | undefined, n: number) =>
    setCart((c) => { const x = { ...c }; const val = Math.max(0, Math.min(n, avail(p, v))); val ? (x[key(p, v)] = val) : delete x[key(p, v)]; return x; });

  const lines = useMemo(() => {
    const out: { p: Product; v?: Variant; n: number }[] = [];
    for (const p of products) {
      const vs = vars(p);
      if (vs.length) vs.forEach((v) => { const n = Math.min(cart[key(p, v)] ?? 0, avail(p, v)); if (n > 0) out.push({ p, v, n }); });
      else { const n = Math.min(cart[key(p)] ?? 0, avail(p)); if (n > 0) out.push({ p, n }); }
    }
    return out;
  }, [cart, products]);
  const count = lines.reduce((a, l) => a + l.n, 0);
  const total = lines.reduce((a, l) => a + (priceOf(l.p, l.v) ?? 0) * l.n, 0);
  const filtered = products.filter((p) =>
    norm([p.name, p.sku, p.category, ...p.tags].filter(Boolean).join(" ")).includes(norm(q)) && (!cat || p.category === cat) && (!tag || p.tags.includes(tag)));

  async function send() {
    setErr(""); setSending(true);
    const win = window.open("", "_blank");
    const r = await placeOrder({ slug: store.slug, items: lines.map((l) => ({ id: l.p.id, variantId: l.v?.id, qty: l.n })), notes: obs });
    setSending(false);
    if (!r.link) { win?.close(); return setErr(r.error ?? "Erro ao enviar."); }
    setCart({}); setOpen(false);
    if (win) win.location.href = r.link; else window.location.href = r.link;
  }

  const Qty = ({ p, v }: { p: Product; v?: Variant }) => {
    const n = cart[key(p, v)] ?? 0;
    if (avail(p, v) <= 0) return <span className="muted">Esgotado</span>;
    return n === 0 ? (
      <button className="btn primary sm" onClick={() => setQty(p, v, 1)}>Adicionar</button>
    ) : (
      <span className="qty"><button onClick={() => setQty(p, v, n - 1)} aria-label="menos">−</button><b>{n}</b><button onClick={() => setQty(p, v, n + 1)} disabled={n >= avail(p, v)} aria-label="mais">+</button></span>
    );
  };

  return (
    <>
      <input className="filter" placeholder="Buscar nos produtos desta loja…" value={q} onChange={(e) => setQ(e.target.value)} />
      {(categories.length > 0 || tags.length > 0) && (
        <div className="chipbar shopfilters">
          {categories.length > 0 && <>
            <button className={"fchip" + (!cat ? " on" : "")} onClick={() => setCat("")}>Tudo</button>
            {categories.map((c) => <button key={c} className={"fchip" + (cat === c ? " on" : "")} onClick={() => setCat(cat === c ? "" : c)}>{c}</button>)}
          </>}
          {tags.length > 0 && <span className="sep" />}
          {tags.map((t) => <button key={t} className={"fchip tag" + (tag === t ? " on" : "")} onClick={() => setTag(tag === t ? "" : t)}>#{t}</button>)}
        </div>
      )}
      {!filtered.length && <p className="muted center-text">Nenhum produto encontrado.</p>}
      <div className="grid products">
        {filtered.map((p) => {
          const imgs = [...p.product_images].sort((a, b) => a.position - b.position);
          const vs = vars(p);
          return (
            <article key={p.id} className="card product">
              <button className="photo" onClick={() => { setHero(null); setZoom(p); }} aria-label={`Ver ${p.name}`}>
                {imgs[0] ? <img src={imgUrl(imgs[0].drive_file_id) + "?s=600"} alt={p.name} loading="lazy" /> : <span />}
                {imgs.length > 1 && <span className="badge">{imgs.length} fotos</span>}
              </button>
              <div className="body">
                <strong>{p.name}</strong>
                {ratings[p.id] && <Stars value={ratings[p.id].avg_rating} count={ratings[p.id].total} />}
                <span className="price">{priceLabel(p)}</span>
                {vs.length > 0 && (
                  <div className="vchips" aria-label="Opções disponíveis">
                    {vs.slice(0, 6).map((v) => (
                      <span key={v.id} className={"vchip" + (avail(p, v) <= 0 ? " out" : "")}>
                        {v.name}{v.stock != null && <b>{v.stock > 0 ? ` · ${v.stock}` : " · esgotado"}</b>}
                      </span>
                    ))}
                    {vs.length > 6 && <span className="vchip more">+{vs.length - 6}</span>}
                  </div>
                )}
                {!vs.length && p.track_stock && (p.stock ?? 0) > 0 && (p.stock ?? 0) <= (p.low_stock_alert ?? 5) && <small className="muted">Restam {p.stock}</small>}
                {soldOut(p) ? <span className="muted">Esgotado</span>
                  : vs.length ? <button className="btn primary sm" onClick={() => { setHero(null); setZoom(p); }}>Escolher opção</button>
                  : <Qty p={p} />}
              </div>
            </article>
          );
        })}
      </div>

      {count > 0 && <button className="cartbar" onClick={() => setOpen(true)}>🛒 Ver pedido · {count} {count === 1 ? "item" : "itens"}{total > 0 && ` · ${brl(total)}`}</button>}

      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <aside className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="between"><h2>Seu pedido</h2><button className="btn ghost" onClick={() => setOpen(false)}>Fechar</button></div>
            {lines.map(({ p, v }) => (
              <div className="line" key={key(p, v)}>
                <span>{p.name}{v && <b> · {v.name}</b>}<br /><small className="muted">{priceOf(p, v) != null ? brl(priceOf(p, v)!) : "Sob consulta"}</small></span>
                <Qty p={p} v={v} />
              </div>
            ))}
            <div className="between total"><span>Total</span><b>{total > 0 ? brl(total) : "—"}</b></div>
            <div className="form">
              <label>Observações<textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Forma de pagamento, retirada, horário…" /></label>
            </div>
            {err && <p className="err">{err}</p>}
            {!store.whatsapp ? <p className="err">Esta loja ainda não informou um WhatsApp.</p>
              : !viewer.loggedIn ? <Link className="btn primary block" href={`/login?next=/${store.slug}`}>Entrar para fazer o pedido</Link>
              : !viewer.hasProfile ? <Link className="btn primary block" href={`/conta?next=/${store.slug}`}>Completar cadastro para pedir</Link>
              : <button className="btn whats block" disabled={sending} onClick={send}>{sending ? "Enviando…" : "Enviar pedido pelo WhatsApp"}</button>}
            <small className="muted">Seu nome, telefone e endereço cadastrados vão junto com o pedido.</small>
            <button className="link" onClick={() => setCart({})}>Limpar pedido</button>
          </aside>
        </div>
      )}

      {zoom && (
        <div className="overlay" onClick={() => setZoom(null)}>
          <div className="lightbox" onClick={(e) => e.stopPropagation()}>
            <button className="btn ghost close" onClick={() => setZoom(null)}>Fechar</button>
            <div className="gallery">
              {[...zoom.product_images].sort((a, b) => (hero ? Number(b.drive_file_id === hero) - Number(a.drive_file_id === hero) : 0) || a.position - b.position).map((im) => (
                <img key={im.id} src={imgUrl(im.drive_file_id) + "?s=1200"} alt={zoom.name} />
              ))}
            </div>
            <h2>{zoom.name}</h2>
            {(zoom.category || zoom.tags.length > 0) && <div className="chips">{zoom.category && <span className="chip">{zoom.category}</span>}{zoom.tags.map((t) => <span className="chip" key={t}>#{t}</span>)}</div>}
            {zoom.sku && <small className="muted">SKU {zoom.sku}</small>}
            {ratings[zoom.id] && <Stars value={ratings[zoom.id].avg_rating} count={ratings[zoom.id].total} />}
            {zoom.description && <p>{zoom.description}</p>}
            {vars(zoom).length ? (
              <Picker key={zoom.id} p={zoom} cart={cart} renderQty={(pp, vv) => <Qty p={pp} v={vv} />} onPhoto={setHero} />
            ) : (
              <div className="between"><span className="price">{priceLabel(zoom)}</span><Qty p={zoom} /></div>
            )}
            <h3>Avaliações deste produto</h3>
            {!(reviews[zoom.id]?.length) && <p className="muted">Sem avaliações ainda.</p>}
            {(reviews[zoom.id] ?? []).map((v) => (
              <div key={v.id} className="rv"><div className="between"><strong>{v.reviewer_name}</strong><Stars value={v.rating} /></div>{v.comment && <p>{v.comment}</p>}</div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
