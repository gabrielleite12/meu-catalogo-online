"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { nameFromFile } from "@/lib/google";
import { slugify } from "@/lib/utils";

async function ctx() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  return { supabase, user: data.user };
}

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);
const refresh = () => revalidatePath("/painel", "layout");

export async function saveStore(_: unknown, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user } = await ctx();
  const id = String(fd.get("id") ?? "");
  const name = String(fd.get("name") ?? "").trim();
  const slug = slugify(String(fd.get("slug") || name));
  if (!name) return { error: "Informe o nome da loja." };
  if (slug.length < 3) return { error: "O endereço precisa ter ao menos 3 letras." };
  const logo = String(fd.get("logo_url") ?? "");
  const row = {
    name,
    slug,
    category: String(fd.get("category") ?? "").trim() || null,
    description: String(fd.get("description") ?? "").trim() || null,
    city: String(fd.get("city") ?? "").trim() || null,
    whatsapp: String(fd.get("whatsapp") ?? "").replace(/\D/g, "") || null,
    payment_methods: list(fd.get("payment_methods")),
    delivery_methods: list(fd.get("delivery_methods")),
    published: fd.get("published") === "on",
    logo_url: logo.startsWith(process.env.NEXT_PUBLIC_SUPABASE_URL + "/storage/v1/object/public/logos/") ? logo : null,
  };
  if (id) {
    const { error } = await supabase.from("stores").update(row).eq("id", id);
    if (error) return { error: error.code === "23505" ? "Esse endereço já está em uso." : error.message };
    refresh();
    revalidatePath(`/${slug}`);
    return { ok: true };
  }
  const { data, error } = await supabase.from("stores").insert({ ...row, owner_id: user.id }).select("id").single();
  if (error) return { error: error.code === "23505" ? "Esse endereço já está em uso." : error.message };
  redirect(`/painel/${data.id}`);
}

export async function deleteStore(fd: FormData) {
  const { supabase } = await ctx();
  await supabase.from("stores").delete().eq("id", String(fd.get("id")));
  refresh();
  redirect("/painel");
}

type FileRef = { id: string; name: string };

/** mode: each = um produto por foto · group = várias fotos num produto · add = fotos em produto existente */
export async function importFiles(input: { storeId: string; mode: "each" | "group" | "add"; files: FileRef[]; groupName?: string; productId?: string }) {
  const { supabase } = await ctx();
  if (!input.files.length) return { error: "Selecione ao menos uma foto." };
  const { data: store } = await supabase.from("stores").select("id").eq("id", input.storeId).maybeSingle();
  if (!store) return { error: "Catálogo não encontrado." };

  const { count } = await supabase.from("products").select("id", { count: "exact", head: true }).eq("store_id", store.id);
  let pos = count ?? 0;

  if (input.mode === "add") {
    if (!input.productId) return { error: "Escolha o produto." };
    const { count: n } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", input.productId);
    const { error } = await supabase.from("product_images").insert(
      input.files.map((f, i) => ({ product_id: input.productId!, drive_file_id: f.id, position: (n ?? 0) + i })),
    );
    if (error) return { error: error.message };
  } else {
    const groups: FileRef[][] = input.mode === "each" ? input.files.map((f) => [f]) : [input.files];
    const rows = groups.map((g, i) => ({
      store_id: store.id, position: pos + i,
      name: input.mode === "group" && input.groupName?.trim() ? input.groupName.trim() : nameFromFile(g[0].name),
    }));
    // inserção em lote: uma consulta para os produtos e outra para as fotos
    const { data: created, error } = await supabase.from("products").insert(rows).select("id,position");
    if (error || !created) return { error: error?.message ?? "Erro ao criar produtos." };
    const byPos = new Map(created.map((c) => [c.position, c.id]));
    const imgs = groups.flatMap((g, gi) => g.map((f, i) => ({ product_id: byPos.get(pos + gi)!, drive_file_id: f.id, position: i })));
    const { error: e2 } = await supabase.from("product_images").insert(imgs);
    if (e2) return { error: e2.message };
  }
  refresh();
  return { ok: true };
}

type VariantInput = { id?: string; name: string; sku?: string; price?: string | number | null; stock?: string | number | null };
const num = (v: unknown) => {
  const t = String(v ?? "").replace(/\./g, "").replace(",", ".").trim();
  return t !== "" && !isNaN(Number(t)) ? Number(t) : null;
};

export async function updateProduct(fd: FormData) {
  const { supabase } = await ctx();
  const id = String(fd.get("id"));
  const track = fd.get("track_stock") === "on";
  let variants: VariantInput[] = [];
  try { variants = JSON.parse(String(fd.get("variants") || "[]")); } catch {}
  variants = variants.filter((v) => v.name?.trim()).slice(0, 200);

  await supabase.from("products").update({
    name: String(fd.get("name") ?? "").trim() || "Sem nome",
    sku: String(fd.get("sku") ?? "").trim() || null,
    description: String(fd.get("description") ?? "").trim() || null,
    price: num(fd.get("price")),
    track_stock: variants.length ? false : track,
    stock: variants.length ? null : track ? Math.max(0, parseInt(String(fd.get("stock") ?? "0"), 10) || 0) : null,
    active: fd.get("active") === "on",
  }).eq("id", id);

  // sincroniza variações: remove as apagadas, atualiza as existentes, cria as novas
  const { data: current } = await supabase.from("product_variants").select("id").eq("product_id", id);
  const keep = new Set(variants.map((v) => v.id).filter(Boolean));
  const gone = (current ?? []).map((c) => c.id).filter((c) => !keep.has(c));
  if (gone.length) await supabase.from("product_variants").delete().in("id", gone);
  for (const [position, v] of variants.entries()) {
    const stock = num(v.stock);
    const row = { name: v.name.trim(), sku: v.sku?.trim() || null, price: num(v.price), stock: stock == null ? null : Math.max(0, Math.floor(stock)), position };
    if (v.id) await supabase.from("product_variants").update(row).eq("id", v.id);
    else await supabase.from("product_variants").insert({ ...row, product_id: id });
  }
  refresh();
}

export async function bulkProducts(input: { ids: string[]; action: "delete" | "hide" | "show" }) {
  const { supabase } = await ctx();
  if (!input.ids.length) return;
  if (input.action === "delete") await supabase.from("products").delete().in("id", input.ids);
  else await supabase.from("products").update({ active: input.action === "show" }).in("id", input.ids);
  refresh();
}

export async function duplicateProduct(fd: FormData) {
  const { supabase } = await ctx();
  const { data: p } = await supabase.from("products")
    .select("*, product_images(drive_file_id,position), product_variants(name,sku,price,stock,position)").eq("id", String(fd.get("id"))).single();
  if (!p) return;
  const { data: copy } = await supabase.from("products").insert({
    store_id: p.store_id, name: `${p.name} (cópia)`, sku: null, description: p.description, price: p.price,
    track_stock: p.track_stock, stock: p.stock, active: false, position: p.position + 1,
  }).select("id").single();
  if (!copy) return;
  if (p.product_images.length) await supabase.from("product_images").insert(p.product_images.map((i: object) => ({ ...i, product_id: copy.id })));
  if (p.product_variants.length) await supabase.from("product_variants").insert(p.product_variants.map((v: object) => ({ ...v, product_id: copy.id })));
  refresh();
}

export async function deleteProduct(fd: FormData) {
  const { supabase } = await ctx();
  await supabase.from("products").delete().eq("id", String(fd.get("id")));
  refresh();
}

export async function removeImage(fd: FormData) {
  const { supabase } = await ctx();
  await supabase.from("product_images").delete().eq("id", String(fd.get("id")));
  refresh();
}

/** Lojista finaliza (baixa o estoque dos itens controlados) ou cancela o pedido. */
export async function setOrderStatus(fd: FormData) {
  const { supabase } = await ctx();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (status !== "finalizado" && status !== "cancelado") return;

  const { data: order } = await supabase.from("orders").select("id,status").eq("id", id).maybeSingle();
  if (!order || order.status !== "novo") return;

  const { error } = await supabase.from("orders")
    .update({ status, finished_at: status === "finalizado" ? new Date().toISOString() : null }).eq("id", id);
  if (error) return;

  if (status === "finalizado") {
    const { data: items } = await supabase.from("order_items").select("product_id,variant_id,qty").eq("order_id", id);
    for (const it of items ?? []) {
      if (it.variant_id) {
        const { data: v } = await supabase.from("product_variants").select("stock").eq("id", it.variant_id).maybeSingle();
        if (v && v.stock != null) await supabase.from("product_variants").update({ stock: Math.max(0, v.stock - it.qty) }).eq("id", it.variant_id);
        continue;
      }
      if (!it.product_id) continue;
      const { data: p } = await supabase.from("products").select("track_stock,stock").eq("id", it.product_id).maybeSingle();
      if (p?.track_stock) await supabase.from("products").update({ stock: Math.max(0, (p.stock ?? 0) - it.qty) }).eq("id", it.product_id);
    }
  }
  refresh();
}

export async function signOut() {
  await (await supabaseServer()).auth.signOut();
  redirect("/");
}
