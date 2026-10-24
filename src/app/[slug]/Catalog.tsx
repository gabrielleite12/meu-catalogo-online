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
  const [type, setType] = useState("");
  const [tag, setTag] = useState("");
  const [sort, setSort] = useState<"" | "menor" | "maior">("");
  const [onlyAvail, setOnlyAvail] = useState(false);
  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const categories = useMemo(() => uniq(products.map((p) => p.category)), [products]);
  // tipos/modelos: só os da categoria escolhida (ou todos, se nenhuma)
  const types = useMemo(() => uniq(products.filter((p) => !cat || p.category === cat).map((p) => p.subcategory)), [products, cat]);
  const tags = useMemo(() => uniq(products.filter((p) => (!cat || p.category === cat) && (!type || p.subcategory === type)).flatMap((p) => p.tags)), [products, cat, type]);
  const countOf = (f: (p: Product) => boolean) => products.filter(f).length;
  const filtered = products.filter((p) =>
    norm([p.name, p.sku, p.category, p.subcategory, ...p.tags].filter(Boolean).join(" ")).includes(norm(q)) &&
    (!cat || p.category === cat) && (!type || p.subcategory === type) && (!tag || p.tags.includes(tag)) && (!onlyAvail || !soldOut(p)));
  const shown = sort ? [...filtered].sort((a, b) => ((priceOf(a) ?? Infinity) - (priceOf(b) ?? Infinity)) * (sort === "menor" ? 1 : -1)) : filtered;
  const pickCat = (c: string) => { setCat(cat === c ? "" : c); setType(""); setTag(""); };
  const clear = () => { setQ(""); setCat(""); setType(""); setTag(""); setSort(""); setOnlyAvail(false); };
  const active = !!(q || cat || type || tag || sort || onlyAvail);

  return (
    <>
      <input className="filter" placeholder="Buscar nesta loja…" value={q} onChange={(e) => setQ(e.target.value)} />
      {categories.length > 0 && (
        <div className="chipbar shopfilters hscroll" aria-label="Categorias">
          <button className={"fchip" + (!cat ? " on" : "")} onClick={() => pickCat(cat)}>Tudo <b>{products.length}</b></button>
          {categories.map((c) => <button key={c} className={"fchip" + (cat === c ? " on" : "")} onClick={() => pickCat(c)}>{c} <b>{countOf((p) => p.category === c)}</b></button>)}
        </div>
      )}
      {types.length > 1 && (
        <div className="chipbar shopfilters hscroll sub" aria-label="Tipos e modelos">
          {types.map((t) => <button key={t} className={"fchip tag" + (type === t ? " on" : "")} onClick={() => { setType(type === t ? "" : t); setTag(""); }}>{t}</button>)}
        </div>
      )}
      {tags.length > 0 && (
        <div className="chipbar shopfilters hscroll sub" aria-label="Etiquetas">
          {tags.map((t) => <button key={t} className={"fchip tag" + (tag === t ? " on" : "")} onClick={() => setTag(tag === t ? "" : t)}>#{t}</button>)}
        </div>
      )}
      <div className="sortbar">
        <small className="muted">{shown.length} {shown.length === 1 ? "produto" : "produtos"}</small>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Ordenar">
          <option value="">Ordem da loja</option><option value="menor">Menor preço</option><option value="maior">Maior preço</option>
        </select>
        <label className="check"><input type="checkbox" checked={onlyAvail} onChange={(e) => setOnlyAvail(e.target.checked)} /> Só disponíveis</label>
        {active && <button className="link" onClick={clear}>Limpar filtros</button>}
      </div>
      {!shown.length && <p className="muted center-text">Nenhum produto encontrado.</p>}
      <div className="grid products">
        {shown.map((p) => {
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
                {(p.subcategory || p.category) && <small className="pcat">{p.subcategory || p.category}</small>}
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
