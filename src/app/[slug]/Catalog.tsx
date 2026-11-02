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
  const [selectedSize, setSelectedSize] = useState("");
  const [sort, setSort] = useState<"" | "menor" | "maior" | "nome">("");
  const [onlyAvail, setOnlyAvail] = useState(false);

  const uniq = (xs: (string | null)[]) => [...new Set(xs.filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const categories = useMemo(() => uniq(products.map((p) => p.category)), [products]);

  // Tipos/subcategorias da categoria atual
  const types = useMemo(() => uniq(products.filter((p) => !cat || p.category === cat).map((p) => p.subcategory)), [products, cat]);

  // Tags da categoria e tipo atuais
  const tags = useMemo(() => uniq(products.filter((p) => (!cat || p.category === cat) && (!type || p.subcategory === type)).flatMap((p) => p.tags)), [products, cat, type]);

  // Coleta todos os tamanhos/números disponíveis nos produtos da categoria atual
  const { availableSizes, sizeLabel } = useMemo(() => {
    const set = new Set<string>();
    let numCount = 0;
    let totalCount = 0;
    const pool = products.filter((p) => !cat || p.category === cat);

    for (const p of pool) {
      const info = parseVariants(p);
      if (info.kind === "two") {
        info.sizes.forEach((s) => {
          set.add(s);
          totalCount++;
          if (/^\d+([.,]\d+)?$/.test(s)) numCount++;
        });
      } else if (info.kind === "one") {
        info.options.forEach((o) => {
          set.add(o);
          totalCount++;
          if (/^\d+([.,]\d+)?$/.test(o)) numCount++;
        });
      }
    }

    const arr = Array.from(set);
    const looksNumber = arr.length > 0 && arr.every((x) => /^\d+([.,]\d+)?$/.test(x));
    const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "EG", "EGG", "U", "UNICO", "ÚNICO"];

    const sorted = looksNumber
      ? [...arr].sort((a, b) => parseFloat(a.replace(",", ".")) - parseFloat(b.replace(",", ".")))
      : [...arr].sort((a, b) => {
          const ia = SIZE_ORDER.indexOf(a.toUpperCase());
          const ib = SIZE_ORDER.indexOf(b.toUpperCase());
          if (ia !== -1 && ib !== -1) return ia - ib;
          if (ia !== -1) return -1;
          if (ib !== -1) return 1;
          return a.localeCompare(b, "pt-BR");
        });

    const isNumeric = totalCount > 0 && numCount / totalCount >= 0.5;
    return {
      availableSizes: sorted,
      sizeLabel: isNumeric ? "Número" : "Tamanho",
    };
  }, [products, cat]);

  // Quantidade de produtos em cada categoria
  const countOfCat = (c: string) => products.filter((p) => p.category === c).length;

  // Verifica se o produto tem o tamanho selecionado
  const matchSize = (p: Product, targetSize: string) => {
    if (!targetSize) return true;
    const info = parseVariants(p);
    if (info.kind === "two") {
      return info.vs.some((v) => info.sizeOf(v) === targetSize && (!onlyAvail || avail(p, v) > 0));
    }
    if (info.kind === "one") {
      return info.vs.some((v) => v.name === targetSize && (!onlyAvail || avail(p, v) > 0));
    }
    return false;
  };

  // Filtragem completa com busca que inclui variantes
  const filtered = useMemo(() => {
    const qNorm = norm(q.trim());
    return products.filter((p) => {
      // Busca em título, SKU, categoria, subcategoria, tags e também nos nomes das variações
      if (qNorm) {
        const variantTexts = p.product_variants.map((v) => v.name).join(" ");
        const fullText = norm([p.name, p.sku, p.category, p.subcategory, ...p.tags, variantTexts].filter(Boolean).join(" "));
        if (!fullText.includes(qNorm)) return false;
      }
      if (cat && p.category !== cat) return false;
      if (type && p.subcategory !== type) return false;
      if (tag && !p.tags.includes(tag)) return false;
      if (selectedSize && !matchSize(p, selectedSize)) return false;
      if (onlyAvail && soldOut(p)) return false;
      return true;
    });
  }, [products, q, cat, type, tag, selectedSize, onlyAvail]);

  // Ordenação
  const shown = useMemo(() => {
    if (!sort) return filtered;
    return [...filtered].sort((a, b) => {
      if (sort === "nome") return a.name.localeCompare(b.name, "pt-BR");
      const pa = priceOf(a) ?? (sort === "menor" ? Infinity : -Infinity);
      const pb = priceOf(b) ?? (sort === "menor" ? Infinity : -Infinity);
      return sort === "menor" ? pa - pb : pb - pa;
    });
  }, [filtered, sort]);

  const pickCat = (c: string) => {
    setCat(cat === c ? "" : c);
    setType("");
    setTag("");
    setSelectedSize("");
  };

  const clearAll = () => {
    setQ("");
    setCat("");
    setType("");
    setTag("");
    setSelectedSize("");
    setSort("");
    setOnlyAvail(false);
  };

  const hasActiveFilters = Boolean(q || cat || type || tag || selectedSize || sort || onlyAvail);

  return (
    <div className="catalog-wrapper">
      {/* Caixa de Filtros Principal */}
      <section className="filter-card" aria-label="Filtros do catálogo">
        {/* Barra de busca estilizada */}
        <div className="search-box">
          <span className="search-icon" aria-hidden="true">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          <input
            className="search-input"
            placeholder="Buscar por produto, tamanho (ex: 38, M), cor…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          {q && (
            <button className="search-clear" onClick={() => setQ("")} aria-label="Limpar busca" type="button">
              ✕
            </button>
          )}
        </div>

        {/* Categorias em pills elegantes */}
        {categories.length > 0 && (
          <div className="filter-group">
            <span className="filter-group-label">Categorias</span>
            <div className="filter-pills-row">
              <button
                type="button"
                className={`filter-pill ${!cat ? "active" : ""}`}
                onClick={() => pickCat(cat)}
              >
                Todas <b>{products.length}</b>
              </button>
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`filter-pill ${cat === c ? "active" : ""}`}
                  onClick={() => pickCat(c)}
                >
                  {c} <b>{countOfCat(c)}</b>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Régua de Tamanhos / Números */}
        {availableSizes.length > 0 && (
          <div className="filter-group sizes-group">
            <div className="filter-group-header">
              <span className="filter-group-label">
                Filtrar por <b>{sizeLabel}</b>:
              </span>
              {selectedSize && (
                <button type="button" className="filter-clear-sub" onClick={() => setSelectedSize("")}>
                  Limpar {sizeLabel.toLowerCase()}
                </button>
              )}
            </div>
            <div className="sizes-grid">
              {availableSizes.map((s) => {
                const isSelected = selectedSize === s;
                return (
                  <button
                    key={s}
                    type="button"
                    className={`size-btn ${isSelected ? "selected" : ""}`}
                    onClick={() => setSelectedSize(isSelected ? "" : s)}
                    title={`Filtrar ${sizeLabel} ${s}`}
                  >
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Subcategorias / Modelos (se houver) */}
        {types.length > 1 && (
          <div className="filter-group sub-group">
            <span className="filter-group-label">Modelos:</span>
            <div className="filter-pills-row sub">
              {types.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`filter-pill sm ${type === t ? "active" : ""}`}
                  onClick={() => {
                    setType(type === t ? "" : t);
                    setTag("");
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags / Etiquetas (se houver) */}
        {tags.length > 0 && (
          <div className="filter-group sub-group">
            <span className="filter-group-label">Tags:</span>
            <div className="filter-pills-row sub">
              {tags.map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`filter-pill tag-pill ${tag === t ? "active" : ""}`}
                  onClick={() => setTag(tag === t ? "" : t)}
                >
                  #{t}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Barra de controle: Ordenação + Só Disponíveis + Contagem */}
        <div className="catalog-toolbar">
          <div className="toolbar-left">
            <span className="count-badge">
              <b>{shown.length}</b> {shown.length === 1 ? "produto" : "produtos"}
            </span>

            <label className="toggle-avail">
              <input
                type="checkbox"
                checked={onlyAvail}
                onChange={(e) => setOnlyAvail(e.target.checked)}
              />
              <span>Só disponíveis</span>
            </label>
          </div>

          <div className="toolbar-right">
            <div className="sort-select-wrapper">
              <label htmlFor="sort-select" className="sr-only">Ordenar por</label>
              <select
                id="sort-select"
                className="sort-select"
                value={sort}
                onChange={(e) => setSort(e.target.value as typeof sort)}
              >
                <option value="">Ordem padrão</option>
                <option value="menor">Menor preço</option>
                <option value="maior">Maior preço</option>
                <option value="nome">Nome (A-Z)</option>
              </select>
            </div>

            {hasActiveFilters && (
              <button type="button" className="btn-clear-all" onClick={clearAll} title="Limpar todos os filtros">
                Limpar tudo
              </button>
            )}
          </div>
        </div>

        {/* Badges de filtros ativos */}
        {hasActiveFilters && (
          <div className="active-filters-bar">
            <span className="active-label">Filtros ativos:</span>
            {q && (
              <span className="active-tag">
                Busca: &ldquo;{q}&rdquo; <button onClick={() => setQ("")}>✕</button>
              </span>
            )}
            {cat && (
              <span className="active-tag">
                Categoria: {cat} <button onClick={() => setCat("")}>✕</button>
              </span>
            )}
            {selectedSize && (
              <span className="active-tag size-tag">
                {sizeLabel}: <b>{selectedSize}</b> <button onClick={() => setSelectedSize("")}>✕</button>
              </span>
            )}
            {type && (
              <span className="active-tag">
                Modelo: {type} <button onClick={() => setType("")}>✕</button>
              </span>
            )}
            {tag && (
              <span className="active-tag">
                Tag: #{tag} <button onClick={() => setTag("")}>✕</button>
              </span>
            )}
            {onlyAvail && (
              <span className="active-tag">
                Só disponíveis <button onClick={() => setOnlyAvail(false)}>✕</button>
              </span>
            )}
            {sort && (
              <span className="active-tag">
                Ordem: {sort === "menor" ? "Menor preço" : sort === "maior" ? "Maior preço" : "A-Z"} <button onClick={() => setSort("")}>✕</button>
              </span>
            )}
          </div>
        )}
      </section>

      {/* Mensagem quando não encontra produtos */}
      {!shown.length && (
        <div className="empty-catalog-state">
          <span className="empty-icon">🔍</span>
          <h3>Nenhum produto encontrado</h3>
          <p className="muted">Tente remover alguns filtros ou buscar por outro termo.</p>
          <button type="button" className="btn primary" onClick={clearAll}>
            Limpar todos os filtros
          </button>
        </div>
      )}

      {/* Grid de Produtos */}
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
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
