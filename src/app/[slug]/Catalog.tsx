"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { brl, imgUrl, type Product, type Rating } from "@/lib/utils";
import { Stars } from "@/components/Stars";
import { avail, norm, parseVariants, priceLabel, priceOf, soldOut, vars } from "@/lib/catalog";
import { useStoreCart } from "@/components/StoreCart";

function SizesAndColors({ p }: { p: Product }) {
  const info = parseVariants(p);
  if (info.kind === "none") return null;
  const sizes = info.kind === "two" ? info.sizes : (info.sizeLabel !== "Opção" ? info.options : []);
  const colors = info.kind === "two" ? info.colors.length : (info.sizeLabel === "Opção" ? info.options.length : 0);
  const okSize = (s: string) => info.vs.some((v) => (info.kind === "two" ? info.sizeOf(v) === s : v.name === s) && avail(p, v) > 0);
  const MAX = 7;
  return (
    <div className="pv">
      {colors > 0 && <span className="pcolors">{colors} {info.kind === "two" ? (colors === 1 ? "cor" : "cores") : (colors === 1 ? "opção" : "opções")}</span>}
      {sizes.length > 0 && (
        <div className="psizes" aria-label={info.sizeLabel}>
          {sizes.slice(0, MAX).map((s) => <i key={s} className={okSize(s) ? "" : "o"}>{s}</i>)}
          {sizes.length > MAX && <i className="more">+{sizes.length - MAX}</i>}
        </div>
      )}
    </div>
  );
}

export default function Catalog({ slug, products, ratings }: { slug: string; products: Product[]; ratings: Record<string, Rating> }) {
  const cart = useStoreCart();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [tag, setTag] = useState("");
  const categories = useMemo(() => [...new Set(products.map((p) => p.category).filter(Boolean) as string[])].sort(), [products]);
  const tags = useMemo(() => [...new Set(products.flatMap((p) => p.tags))].sort(), [products]);
  const filtered = products.filter((p) =>
    norm([p.name, p.sku, p.category, ...p.tags].filter(Boolean).join(" ")).includes(norm(q)) && (!cat || p.category === cat) && (!tag || p.tags.includes(tag)));

  return (
    <>
      <input className="filter" placeholder="Buscar nesta loja…" value={q} onChange={(e) => setQ(e.target.value)} />
      {(categories.length > 0 || tags.length > 0) && (
        <div className="chipbar shopfilters hscroll">
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
          const out = soldOut(p);
          const simple = vars(p).length === 0;
          return (
            <article key={p.id} className={"pcard" + (out ? " soldout" : "")}>
              <Link href={`/${slug}/p/${p.id}`} className="pimg" aria-label={p.name}>
                {imgs[0] ? <img src={imgUrl(imgs[0].drive_file_id) + "?s=600"} alt={p.name} loading="lazy" /> : <span />}
                {imgs[1] && <img className="alt" src={imgUrl(imgs[1].drive_file_id) + "?s=600"} alt="" loading="lazy" />}
                {out && <span className="ribbon">Esgotado</span>}
              </Link>
              <div className="pinfo2">
                {p.category && <small className="pcat">{p.category}</small>}
                <Link href={`/${slug}/p/${p.id}`} className="pname">{p.name}</Link>
                {ratings[p.id] && <Stars value={ratings[p.id].avg_rating} count={ratings[p.id].total} />}
                <span className="price">{priceLabel(p)}</span>
                <SizesAndColors p={p} />
                {simple && !out && (() => {
                  const n = cart.qty(p);
                  return n === 0
                    ? <button className="btn primary sm" onClick={() => cart.add(p)}>Adicionar</button>
                    : <span className="qty"><button onClick={() => cart.set(p, undefined, n - 1)} aria-label="menos">−</button><b>{n}</b><button onClick={() => cart.set(p, undefined, n + 1)} disabled={n >= avail(p)} aria-label="mais">+</button></span>;
                })()}
                {!simple && !out && <Link href={`/${slug}/p/${p.id}`} className="plink">Ver opções →</Link>}
                {priceOf(p) == null && null}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
