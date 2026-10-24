// Regras de exibição de produtos/variações da vitrine (puras, usadas no servidor e no cliente).
import { brl, type Product, type Variant } from "./utils";

export const norm = (t: string) => t.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
export const vars = (p: Product) => p.product_variants.filter((v) => v.active).sort((a, b) => a.position - b.position);
export const key = (p: Product, v?: Variant) => `${p.id}|${v?.id ?? ""}`;
export const avail = (p: Product, v?: Variant) => (v ? (v.stock == null ? 999 : v.stock) : p.track_stock ? p.stock ?? 0 : 999);
export const priceOf = (p: Product, v?: Variant) => { const x = v?.price ?? p.price; return x != null && Number(x) > 0 ? Number(x) : null; };
export const soldOut = (p: Product) => (vars(p).length ? vars(p).every((v) => avail(p, v) <= 0) : avail(p) <= 0);
export const stockText = (p: Product, v?: Variant) => {
  const n = avail(p, v);
  if (n <= 0) return "Esgotado";
  const raw = v ? v.stock : p.track_stock ? p.stock : null;
  if (raw == null) return "Disponível";
  return raw <= (p.low_stock_alert ?? 5) ? `Restam ${raw}` : `${raw} em estoque`;
};

export function priceLabel(p: Product) {
  const vs = vars(p);
  const prices = (vs.length ? vs.map((v) => priceOf(p, v)) : [priceOf(p)]).filter((x): x is number => x != null);
  if (!prices.length) return "Sob consulta";
  const min = Math.min(...prices), max = Math.max(...prices);
  return min === max ? brl(min) : `a partir de ${brl(min)}`;
}

const looksNumber = (a: string[]) => a.length > 0 && a.every((x) => /^\d+([.,]\d+)?$/.test(x));
const looksSize = (a: string[]) => a.length > 0 && a.every((x) => /^(PP|P|M|G|GG|XG|XGG|EG|EGG|U|UNICO|ÚNICO)$/i.test(x));
const SIZE_ORDER = ["PP", "P", "M", "G", "GG", "XG", "XGG", "EG", "EGG", "U", "UNICO", "ÚNICO"];

export type Parsed = {
  kind: "none" | "one" | "two";
  vs: Variant[];
  sizes: string[]; colors: string[]; options: string[];
  sizeLabel: string; optionLabel: string;
  sizeOf: (v: Variant) => string; colorOf: (v: Variant) => string;
  find: (size?: string, color?: string) => Variant | undefined;
};

/** Interpreta "38 / Vermelho" como número × cor (aceita também a ordem inversa e variações de um só atributo). */
export function parseVariants(p: Product): Parsed {
  const vs = vars(p);
  const parts = vs.map((v) => v.name.split(" / ").map((x) => x.trim()));
  const uniq = (a: string[]) => [...new Set(a)];
  const sortSizes = (a: string[]) =>
    looksNumber(a) ? [...a].sort((x, y) => parseFloat(x.replace(",", ".")) - parseFloat(y.replace(",", ".")))
    : looksSize(a) ? [...a].sort((x, y) => SIZE_ORDER.indexOf(x.toUpperCase()) - SIZE_ORDER.indexOf(y.toUpperCase())) : a;
  const label = (a: string[]) => (looksNumber(a) ? "Número" : looksSize(a) ? "Tamanho" : "Opção");

  if (!vs.length) return { kind: "none", vs, sizes: [], colors: [], options: [], sizeLabel: "", optionLabel: "", sizeOf: () => "", colorOf: () => "", find: () => undefined };

  if (parts.every((a) => a.length === 2)) {
    const a0 = uniq(parts.map((x) => x[0])), a1 = uniq(parts.map((x) => x[1]));
    const sizeIdx = !(looksNumber(a0) || looksSize(a0)) && (looksNumber(a1) || looksSize(a1)) ? 1 : 0;
    const colorIdx = 1 - sizeIdx;
    const sizeOf = (v: Variant) => v.name.split(" / ")[sizeIdx]?.trim() ?? "";
    const colorOf = (v: Variant) => v.name.split(" / ")[colorIdx]?.trim() ?? "";
    const sizes = sortSizes(uniq(vs.map(sizeOf)));
    return {
      kind: "two", vs, sizes, colors: uniq(vs.map(colorOf)), options: [], sizeLabel: label(sizes), optionLabel: "Cor", sizeOf, colorOf,
      find: (size, color) => vs.find((v) => sizeOf(v) === size && colorOf(v) === color),
    };
  }
  const options = sortSizes(uniq(vs.map((v) => v.name)));
  return { kind: "one", vs, sizes: [], colors: [], options, sizeLabel: label(options), optionLabel: label(options), sizeOf: (v) => v.name, colorOf: () => "", find: (o) => vs.find((v) => v.name === o) };
}
