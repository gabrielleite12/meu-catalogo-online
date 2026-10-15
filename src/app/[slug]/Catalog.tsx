"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { brl, imgUrl, type Product, type Rating, type Review } from "@/lib/utils";
import { Stars } from "@/components/Stars";
import { placeOrder } from "./actions";

type S = { slug: string; name: string; whatsapp: string | null };

type Viewer = { loggedIn: boolean; hasProfile: boolean };

export default function Catalog({ store, products, ratings, reviews, viewer }: {
  store: S; products: Product[]; ratings: Record<string, Rating>; reviews: Record<string, Review[]>; viewer: Viewer;
}) {
  const key = `cart:${store.slug}`;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [obs, setObs] = useState("");
  const [zoom, setZoom] = useState<Product | null>(null);

  useEffect(() => { try { setCart(JSON.parse(localStorage.getItem(key) || "{}")); } catch {} }, [key]);
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(cart)); } catch {} }, [cart, key]);

  const max = (p: Product) => (p.track_stock ? p.stock ?? 0 : 999);
  const set = (p: Product, n: number) =>
    setCart((c) => { const x = { ...c }; const v = Math.max(0, Math.min(n, max(p))); v ? (x[p.id] = v) : delete x[p.id]; return x; });

  const lines = useMemo(
    () => products.filter((p) => cart[p.id]).map((p) => ({ p, n: Math.min(cart[p.id], max(p)) })).filter((l) => l.n > 0),
    [cart, products],
  );
  const count = lines.reduce((a, l) => a + l.n, 0);
  const total = lines.reduce((a, l) => a + (l.p.price ?? 0) * l.n, 0);
  const hasUnpriced = lines.some((l) => l.p.price == null);

  const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const filtered = products.filter((p) => norm(p.name).includes(norm(q)));

  async function send() {
    setErr(""); setSending(true);
    const win = window.open("", "_blank");
    const r = await placeOrder({ slug: store.slug, items: lines.map((l) => ({ id: l.p.id, qty: l.n })), notes: obs });
    setSending(false);
    if (!r.link) { win?.close(); return setErr(r.error ?? "Erro ao enviar."); }
    setCart({}); setOpen(false);
    if (win) win.location.href = r.link; else window.location.href = r.link;
  }

  const Qty = ({ p }: { p: Product }) => {
    const n = cart[p.id] ?? 0;
    const out = p.track_stock && (p.stock ?? 0) <= 0;
    if (out) return <span className="muted">Esgotado</span>;
    return n === 0 ? (
      <button className="btn primary sm" onClick={() => set(p, 1)}>Adicionar</button>
    ) : (
      <span className="qty"><button onClick={() => set(p, n - 1)} aria-label="menos">−</button><b>{n}</b><button onClick={() => set(p, n + 1)} disabled={n >= max(p)} aria-label="mais">+</button></span>
    );
  };

  return (
    <>
      <input className="filter" placeholder="Buscar nos produtos desta loja…" value={q} onChange={(e) => setQ(e.target.value)} />
      {!filtered.length && <p className="muted center-text">Nenhum produto encontrado.</p>}
      <div className="grid products">
        {filtered.map((p) => {
          const imgs = [...p.product_images].sort((a, b) => a.position - b.position);
          return (
            <article key={p.id} className="card product">
              <button className="photo" onClick={() => setZoom(p)} aria-label={`Ver ${p.name}`}>
                {imgs[0] ? <img src={imgUrl(imgs[0].drive_file_id) + "?s=600"} alt={p.name} loading="lazy" /> : <span />}
                {imgs.length > 1 && <span className="badge">{imgs.length} fotos</span>}
              </button>
              <div className="body">
                <strong>{p.name}</strong>
                {ratings[p.id] && <Stars value={ratings[p.id].avg_rating} count={ratings[p.id].total} />}
                <span className="price">{p.price != null ? brl(p.price) : "Sob consulta"}</span>
                {p.track_stock && (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 5 && <small className="muted">Restam {p.stock}</small>}
                <Qty p={p} />
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
            {lines.map(({ p, n }) => (
              <div className="line" key={p.id}>
                <span>{p.name}<br /><small className="muted">{p.price != null ? brl(p.price) : "Sob consulta"}</small></span>
                <Qty p={p} />
              </div>
            ))}
            <div className="between total"><span>Total</span><b>{total > 0 ? brl(total) : "—"}</b></div>
            <div className="form">
              <label>Observações<textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Endereço, forma de pagamento, retirada…" /></label>
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
              {[...zoom.product_images].sort((a, b) => a.position - b.position).map((im) => (
                <img key={im.id} src={imgUrl(im.drive_file_id) + "?s=1200"} alt={zoom.name} />
              ))}
            </div>
            <h2>{zoom.name}</h2>
            {ratings[zoom.id] && <Stars value={ratings[zoom.id].avg_rating} count={ratings[zoom.id].total} />}
            {zoom.description && <p>{zoom.description}</p>}
            <div className="between"><span className="price">{zoom.price != null ? brl(zoom.price) : "Sob consulta"}</span><Qty p={zoom} /></div>
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
