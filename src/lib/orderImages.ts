import type { SupabaseClient } from "@supabase/supabase-js";

type Row = { id: string; product_id?: string | null; variant_id?: string | null };

// Foto de cada item do pedido: a da variação escolhida (cor/modelo), senão a primeira do produto.
export async function itemPhotos(supabase: SupabaseClient, items: Row[]): Promise<Map<string, string>> {
  const out = new Map<string, string>();
  const productIds = [...new Set(items.map((i) => i.product_id).filter((x): x is string => !!x))];
  if (!productIds.length) return out;
  const { data } = await supabase
    .from("products").select("id, product_images(drive_file_id,position), product_variants(id,image_file_id)").in("id", productIds);
  const byProduct = new Map((data ?? []).map((p) => [p.id as string, p]));
  for (const i of items) {
    const p = i.product_id ? byProduct.get(i.product_id) : null;
    if (!p) continue;
    const v = (p.product_variants as { id: string; image_file_id: string | null }[]).find((x) => x.id === i.variant_id);
    const first = [...(p.product_images as { drive_file_id: string; position: number }[])].sort((a, b) => a.position - b.position)[0];
    const file = v?.image_file_id || first?.drive_file_id;
    if (file) out.set(i.id, file);
  }
  return out;
}
