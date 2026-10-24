// Cálculo de frete (lógica pura). Espelha a função shipping_quote do banco, que é a que vale ao enviar o pedido;
// aqui serve para mostrar o frete no carrinho antes de enviar.

export type ShippingMode = "pago" | "gratis" | "combinar" | "nao_entrega";
export type ShippingRule = {
  id: string; store_id: string; scope: "city" | "state" | "other"; city: string | null; state: string | null;
  mode: ShippingMode; fee: number | null; free_above: number | null; note: string | null; position: number;
};
export type Quote = { mode: ShippingMode; fee: number | null; label: string; note: string | null };

const fmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const normPlace = (s: string | null | undefined) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();

/** A regra mais específica vence: cidade+UF, cidade, estado, demais locais. */
export function quoteShipping(rules: ShippingRule[], place: { city?: string | null; state?: string | null }, subtotal: number): Quote {
  const city = normPlace(place.city), uf = (place.state ?? "").trim().toUpperCase();
  const rank = (r: ShippingRule) =>
    r.scope === "city" ? (normPlace(r.city) === city && (!r.state?.trim() || r.state.trim().toUpperCase() === uf) ? (r.state?.trim() ? 4 : 3) : 0)
    : r.scope === "state" ? (r.state?.trim().toUpperCase() === uf ? 2 : 0) : 1;
  const hit = rules.map((r, i) => ({ r, i, k: rank(r) })).filter((x) => x.k > 0)
    .sort((a, b) => b.k - a.k || a.r.position - b.r.position || a.i - b.i)[0]?.r;
  if (!hit) return { mode: "combinar", fee: null, label: "Frete a combinar com a loja", note: null };
  if (hit.mode === "nao_entrega") return { mode: "nao_entrega", fee: null, label: "A loja não entrega neste endereço", note: hit.note };
  if (hit.mode === "combinar") return { mode: "combinar", fee: null, label: "Frete a combinar com a loja", note: hit.note };
  if (hit.mode === "gratis" || (hit.free_above != null && subtotal >= hit.free_above)) return { mode: "gratis", fee: 0, label: "Frete grátis", note: hit.note };
  return { mode: "pago", fee: hit.fee, label: "Frete", note: hit.note };
}

/** Texto curto da regra para o lojista ("R$ 12,00 · grátis acima de R$ 100,00"). */
export function ruleSummary(r: Pick<ShippingRule, "mode" | "fee" | "free_above">): string {
  if (r.mode === "nao_entrega") return "Não entrega";
  if (r.mode === "combinar") return "A combinar";
  if (r.mode === "gratis") return "Frete grátis";
  return `${fmt(r.fee ?? 0)}${r.free_above ? ` · grátis acima de ${fmt(r.free_above)}` : ""}`;
}

export function ruleWhere(r: Pick<ShippingRule, "scope" | "city" | "state">): string {
  if (r.scope === "city") return `${r.city}${r.state ? `/${r.state}` : ""}`;
  if (r.scope === "state") return `Estado ${r.state}`;
  return "Demais locais";
}

export const UFS = ["AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO"];
