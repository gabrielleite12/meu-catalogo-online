"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { brl, imgUrl, type Product, type Rating, type Review } from "@/lib/utils";
import { Stars } from "@/components/Stars";
import { avail, parseVariants, priceLabel, priceOf, soldOut, stockText } from "@/lib/catalog";
import { useStoreCart } from "@/components/StoreCart";

type StoreLite = { slug: string; name: string; logo_url: string | null; payment_methods: string[]; delivery_methods: string[] };

export default function ProductView({ store, product: p, rating, reviews, related }: {
  store: StoreLite; product: Product; rating: Rating | null; reviews: Review[]; related: Product[];
}) {
  const cart = useStoreCart();
  const info = useMemo(() => parseVariants(p), [p]);
  const imgs = useMemo(() => [...p.product_images].sort((a, b) => a.position - b.position), [p]);
  const track = useRef<HTMLDivElement>(null);
  const [idx, setIdx] = useState(0);
  const [color, setColor] = useState(info.kind === "two" && info.colors.length === 1 ? info.colors[0] : "");
  const [size, setSize] = useState(info.kind === "two" && info.sizes.length === 1 ? info.sizes[0] : "");
  const [opt, setOpt] = useState("");
  const [toast, setToast] = useState(false);

  // variação escolhida (ou undefined se faltar escolher / produto simples)
  const v = info.kind === "two" ? info.find(size, color) : info.kind === "one" ? info.find(opt) : undefined;
  const needs = info.kind === "two" ? (!color ? `Selecione a ${info.optionLabel.toLowerCase()}` : !size ? `Selecione o ${info.sizeLabel.toLowerCase()}` : "")
    : info.kind === "one" ? (!opt ? `Selecione ${info.optionLabel === "Opção" ? "uma opção" : `o ${info.optionLabel.toLowerCase()}`}` : "") : "";
  const ready = !needs && (info.kind === "none" ? true : !!v);
  const out = ready ? avail(p, v) <= 0 : soldOut(p);
  const n = cart.qty(p, v);
  const price = ready ? priceOf(p, v) : null;

  const goTo = (i: number) => { const t = track.current; if (t && i >= 0 && i < imgs.length) t.scrollTo({ left: i * t.clientWidth, behavior: "smooth" }); setIdx(i); };
  const showFile = (file: string | null | undefined) => { if (!file) return; const i = imgs.findIndex((x) => x.drive_file_id === file); if (i >= 0) goTo(i); };
  const onScroll = () => { const t = track.current; if (t) setIdx(Math.round(t.scrollLeft / Math.max(1, t.clientWidth))); };

  // a foto acompanha a variação escolhida
  const photoOfColor = (c: string, s?: string) =>
    info.vs.find((x) => info.colorOf(x) === c && (!s || info.sizeOf(x) === s) && x.image_file_id)?.image_file_id ?? info.vs.find((x) => info.colorOf(x) === c && x.image_file_id)?.image_file_id;
  useEffect(() => { if (v?.image_file_id) showFile(v.image_file_id); /* eslint-disable-next-line */ }, [v?.id]);

  const colorOut = (c: string) => info.vs.filter((x) => info.colorOf(x) === c).every((x) => avail(p, x) <= 0);
  const sizeState = (s: string) => {
    const pool = info.vs.filter((x) => info.sizeOf(x) === s && (!color || info.colorOf(x) === color));
    return { exists: pool.length > 0, out: pool.length > 0 && pool.every((x) => avail(p, x) <= 0) };
  };

  function addToCart() {
    if (!ready || out) return;
    cart.add(p, v);
    setToast(true);
    setTimeout(() => setToast(false), 2800);
  }

  const Buy = ({ sticky }: { sticky?: boolean }) => (
    <div className={sticky ? "buybar" : "buyinline"}>
      {sticky && <div className="bprice"><b>{price != null ? brl(price) : priceLabel(p)}</b>{v && <small className="muted">{v.name}</small>}</div>}
      {n > 0 && ready ? (
        <span className="qty big"><button onClick={() => cart.set(p, v, n - 1)} aria-label="menos">−</button><b>{n}</b><button onClick={() => cart.set(p, v, n + 1)} disabled={n >= avail(p, v)} aria-label="mais">+</button></span>
      ) : (
        <button className="btn primary buy" disabled={!ready || out} onClick={addToCart}>
          {out && ready ? "Esgotado" : !ready ? needs : "Adicionar ao pedido"}
        </button>
      )}
      {(cart.count > 0) && <button className="btn viewcart" onClick={cart.openCart} aria-label="Ver pedido">🛒 {cart.count}</button>}
    </div>
  );

  return (
    <main className="wrap pp-wrap">
      <nav className="crumb"><Link href={`/${store.slug}`}>← {store.name}</Link>{p.category && <> <span>/</span> <span>{p.category}</span></>}</nav>

      <div className="pp">
        <div className="gal">
          <div className="gmain">
            <div className="gtrack" ref={track} onScroll={onScroll}>
              {imgs.length ? imgs.map((im, i) => <img key={im.id} src={imgUrl(im.drive_file_id) + "?s=1200"} alt={`${p.name} — foto ${i + 1}`} loading={i === 0 ? "eager" : "lazy"} />) : <div className="gempty" />}
            </div>
            {imgs.length > 1 && <div className="gdots">{imgs.map((_, i) => <i key={i} className={i === idx ? "on" : ""} />)}</div>}
            {soldOut(p) && <span className="ribbon">Esgotado</span>}
          </div>
          {imgs.length > 1 && (
            <div className="gthumbs">
              {imgs.map((im, i) => (
                <button key={im.id} className={i === idx ? "on" : ""} onClick={() => goTo(i)} aria-label={`Foto ${i + 1}`}><img src={imgUrl(im.drive_file_id) + "?s=160"} alt="" /></button>
              ))}
            </div>
          )}
        </div>

        <div className="pdetail">
          <h1 className="ptitle">{p.name}</h1>
          <div className="pmeta">
            {rating ? <a href="#avaliacoes"><Stars value={rating.avg_rating} count={rating.total} /></a> : <small className="muted">Sem avaliações</small>}
            {p.sku && <small className="muted">Cód. {p.sku}</small>}
          </div>
          <div className="pprice"><b>{ready && price != null ? brl(price) : priceLabel(p)}</b></div>
          {(p.tags.length > 0) && <div className="chips">{p.tags.map((t) => <span className="chip" key={t}>#{t}</span>)}</div>}

          {info.kind === "two" && (
            <>
              <div className="sel">
                <div className="selh"><b>{info.optionLabel}:</b> <span>{color || "escolha"}</span></div>
                <div className="swatches">
                  {info.colors.map((c) => {
                    const f = photoOfColor(c);
                    return (
                      <button key={c} className={"sw" + (color === c ? " on" : "") + (colorOut(c) ? " out" : "")} title={c}
                        onClick={() => { const next = color === c ? "" : c; setColor(next); if (next) showFile(photoOfColor(next, size)); }}>
                        {f ? <img src={imgUrl(f) + "?s=120"} alt={c} /> : <span className="swt">{c}</span>}
                        {f && <small>{c}</small>}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="sel">
                <div className="selh"><b>{info.sizeLabel}:</b> <span>{size || "escolha"}</span></div>
                <div className="sizes">
                  {info.sizes.map((s) => {
                    const st = sizeState(s);
                    return <button key={s} className={"sz" + (size === s ? " on" : "") + (st.out ? " out" : "")} disabled={!st.exists} onClick={() => setSize(size === s ? "" : s)}>{s}</button>;
                  })}
                </div>
              </div>
            </>
          )}
          {info.kind === "one" && (
            <div className="sel">
              <div className="selh"><b>{info.optionLabel}:</b> <span>{opt || "escolha"}</span></div>
              <div className="sizes">
                {info.options.map((o) => { const x = info.find(o); const isOut = x ? avail(p, x) <= 0 : true; return <button key={o} className={"sz wide" + (opt === o ? " on" : "") + (isOut ? " out" : "")} onClick={() => { setOpt(opt === o ? "" : o); showFile(x?.image_file_id); }}>{o}</button>; })}
              </div>
            </div>
          )}

          <div className={"stockline" + (ready ? (out ? " out" : avail(p, v) <= (p.low_stock_alert ?? 5) ? " low" : " ok") : "")}>
            {ready ? stockText(p, v) : info.kind === "none" ? stockText(p) : "Escolha as opções para ver a disponibilidade"}
          </div>

          <Buy />
          {toast && <div className="toast" role="status">✓ Adicionado ao pedido <button className="link" onClick={cart.openCart}>Ver pedido</button></div>}

          <div className="shipinfo">
            {store.payment_methods.length > 0 && <div>💳 <b>Pagamento:</b> {store.payment_methods.join(", ")}</div>}
            {store.delivery_methods.length > 0 && <div>📦 <b>Entrega:</b> {store.delivery_methods.join(", ")}</div>}
            <div className="muted">O pagamento é combinado direto com a loja pelo WhatsApp.</div>
          </div>

          {info.kind === "two" && (
            <details className="avtable">
              <summary>Ver disponibilidade completa</summary>
              <div className="mscroll">
                <table>
                  <thead><tr><th>{info.optionLabel} \ {info.sizeLabel}</th>{info.sizes.map((s) => <th key={s}>{s}</th>)}</tr></thead>
                  <tbody>
                    {info.colors.map((c) => (
                      <tr key={c}><th>{c}</th>{info.sizes.map((s) => {
                        const x = info.find(s, c);
                        return <td key={s} className={!x ? "na" : avail(p, x) <= 0 ? "o" : ""}>{!x ? "—" : x.stock == null ? "✓" : x.stock > 0 ? x.stock : "0"}</td>;
                      })}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          )}
        </div>
      </div>

      {p.description && (<section className="psec"><h2>Descrição</h2><p className="pdesc">{p.description}</p></section>)}

      <section id="avaliacoes" className="psec">
        <h2>Avaliações do produto</h2>
        {rating && <p><Stars value={rating.avg_rating} count={rating.total} /></p>}
        {!reviews.length && <p className="muted">Sem avaliações ainda. Só clientes com pedido entregue podem avaliar.</p>}
        {reviews.map((r) => (
          <div key={r.id} className="card rv"><div className="between"><strong>{r.reviewer_name}</strong><Stars value={r.rating} /></div>{r.comment && <p>{r.comment}</p>}<small className="muted">{new Date(r.created_at).toLocaleDateString("pt-BR")}</small></div>
        ))}
      </section>

      {related.length > 0 && (
        <section className="psec">
          <h2>{p.category ? `Mais em ${p.category}` : "Veja também"}</h2>
          <div className="hscroll rel">
            {related.map((x) => {
              const im = [...x.product_images].sort((a, b) => a.position - b.position)[0];
              return (
                <Link key={x.id} href={`/${store.slug}/p/${x.id}`} className="rcard">
                  <span className="rimg">{im && <img src={imgUrl(im.drive_file_id) + "?s=400"} alt="" loading="lazy" />}</span>
                  <span className="rname">{x.name}</span>
                  <b>{priceLabel(x)}</b>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <Buy sticky />
    </main>
  );
}
