"use client";
import { useEffect, useMemo, useState } from "react";
import { brl, imgUrl, type Product } from "@/lib/utils";

type S = { slug: string; name: string; whatsapp: string | null };

export default function Catalog({ store, products }: { store: S; products: Product[] }) {
  const key = `cart:${store.slug}`;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [nome, setNome] = useState("");
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

  const message = () => {
    const rows = lines.map((l) => `• ${l.n}x ${l.p.name}${l.p.price != null ? ` — ${brl(l.p.price * l.n)}` : ""}`);
    return [
      `Olá! Gostaria de fazer um pedido na *${store.name}*:`, "",
      ...rows, "",
      total > 0 ? `*Total:* ${brl(total)}${hasUnpriced ? " (+ itens sob consulta)" : ""}` : "",
      nome ? `Nome: ${nome}` : "", obs ? `Obs.: ${obs}` : "",
    ].filter((l, i, a) => l !== "" || (a[i - 1] !== "" && i > 0)).join("\n").trim();
  };
  const link = store.whatsapp ? `https://wa.me/${store.whatsapp.length <= 11 ? "55" + store.whatsapp : store.whatsapp}?text=${encodeURIComponent(message())}` : null;

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
              <label>Seu nome<input value={nome} onChange={(e) => setNome(e.target.value)} /></label>
              <label>Observações<textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Endereço, forma de pagamento, retirada…" /></label>
            </div>
            {link
              ? <a className="btn whats block" href={link} target="_blank" rel="noopener">Enviar pedido pelo WhatsApp</a>
              : <p className="err">Esta loja ainda não informou um WhatsApp.</p>}
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
            {zoom.description && <p>{zoom.description}</p>}
            <div className="between"><span className="price">{zoom.price != null ? brl(zoom.price) : "Sob consulta"}</span><Qty p={zoom} /></div>
          </div>
        </div>
      )}
    </>
  );
}
