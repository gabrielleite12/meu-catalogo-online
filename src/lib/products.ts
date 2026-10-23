// Salvar produto (dados + variações). Sem dependências do Next, para poder ser testado com um cliente Supabase real.
import type { SupabaseClient } from "@supabase/supabase-js";
import { csvList } from "./utils";

type VariantInput = { id?: string; name: string; sku?: string; barcode?: string; image?: string; price?: string | number | null; stock?: string | number | null };
// "1.299,90" -> 1299.9 · "199.9" -> 199.9 · "199,9" -> 199.9
const pos = (n: number | null) => (n != null && n > 0 ? n : null); // preço 0 = sem preço (sob consulta)
export const num = (v: unknown) => {
  let t = String(v ?? "").trim();
  if (t.includes(",")) t = t.replace(/\./g, "").replace(",", ".");
  return t !== "" && !isNaN(Number(t)) ? Number(t) : null;
};

export async function saveProductForm(supabase: SupabaseClient, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const id = String(fd.get("id"));
  const track = fd.get("track_stock") === "on";
  let variants: VariantInput[] = [];
  try { variants = JSON.parse(String(fd.get("variants") || "[]")); } catch {}
  variants = variants.filter((v) => v.name?.trim()).slice(0, 200);

  const { error: eUp } = await supabase.from("products").update({
    name: String(fd.get("name") ?? "").trim() || "Sem nome",
    sku: String(fd.get("sku") ?? "").trim() || null,
    barcode: String(fd.get("barcode") ?? "").trim() || null,
    category: String(fd.get("category") ?? "").trim() || null,
    tags: csvList(String(fd.get("tags") ?? "")),
    low_stock_alert: (() => { const n = num(fd.get("low_stock_alert")); return n == null ? null : Math.max(0, Math.floor(n)); })(),
    hide_when_out: fd.get("hide_when_out") === "on",
    auto_hidden: false,
    description: String(fd.get("description") ?? "").trim() || null,
    price: pos(num(fd.get("price"))),
    track_stock: variants.length ? false : track,
    stock: variants.length ? null : track ? Math.max(0, parseInt(String(fd.get("stock") ?? "0"), 10) || 0) : null,
    active: fd.get("active") === "on",
  }).eq("id", id);
  if (eUp) return { error: `Não foi possível salvar: ${eUp.message}` };

  // sincroniza variações: remove as apagadas, atualiza as existentes, cria as novas
  const { data: current } = await supabase.from("product_variants").select("id").eq("product_id", id);
  const keep = new Set(variants.map((v) => v.id).filter(Boolean));
  const gone = (current ?? []).map((c) => c.id).filter((c) => !keep.has(c));
  if (gone.length) {
    const { error } = await supabase.from("product_variants").delete().in("id", gone);
    if (error) return { error: `Erro nas variações: ${error.message}` };
  }
  for (const [position, v] of variants.entries()) {
    const stock = num(v.stock);
    const row = { name: v.name.trim(), sku: v.sku?.trim() || null, barcode: v.barcode?.trim() || null, image_file_id: v.image?.trim() || null, price: pos(num(v.price)), stock: stock == null ? null : Math.max(0, Math.floor(stock)), position };
    const { error } = v.id
      ? await supabase.from("product_variants").update(row).eq("id", v.id)
      : await supabase.from("product_variants").insert({ ...row, product_id: id });
    if (error) return { error: `Erro na variação "${row.name}": ${error.message}` };
  }
  return { ok: true };
}

