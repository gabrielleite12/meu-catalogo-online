"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { nameFromFile } from "@/lib/google";
import { slugify, csvList } from "@/lib/utils";
import { saveProductForm, num } from "@/lib/products";

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
export async function importFiles(input: { storeId: string; mode: "each" | "group" | "add"; files: FileRef[]; groupName?: string; productId?: string; category?: string; tags?: string }) {
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
    const cat = input.category?.trim() || null;
    const tags = csvList(input.tags ?? "");
    const rows = groups.map((g, i) => ({
      store_id: store.id, position: pos + i, category: cat, tags,
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

export async function updateProduct(_: unknown, fd: FormData): Promise<{ ok?: boolean; error?: string }> {
  const { supabase } = await ctx();
  const r = await saveProductForm(supabase, fd);
  if (r.ok) refresh();
  return r;
}

export async function bulkProducts(input: { ids: string[]; action: "delete" | "hide" | "show" | "category" | "tags_add"; value?: string }) {
  const { supabase } = await ctx();
  if (!input.ids.length) return;
  if (input.action === "delete") await supabase.from("products").delete().in("id", input.ids);
  else if (input.action === "category") await supabase.from("products").update({ category: (input.value ?? "").trim() || null }).in("id", input.ids);
  else if (input.action === "tags_add") {
    const add = csvList(input.value ?? "");
    const { data } = await supabase.from("products").select("id,tags").in("id", input.ids);
    for (const p of data ?? []) await supabase.from("products").update({ tags: [...new Set([...(p.tags ?? []), ...add])] }).eq("id", p.id);
  } else await supabase.from("products").update({ active: input.action === "show", auto_hidden: false }).in("id", input.ids);
  refresh();
}

/** Junta vários produtos em um só: as fotos dos demais vão para o primeiro, e os demais são removidos. */
export async function mergeProducts(input: { ids: string[] }) {
  const { supabase } = await ctx();
  const [main, ...rest] = input.ids;
  if (!main || !rest.length) return { error: "Selecione ao menos 2 produtos." };
  const { count } = await supabase.from("product_images").select("id", { count: "exact", head: true }).eq("product_id", main);
  const { data: imgs } = await supabase.from("product_images").select("id,product_id,position").in("product_id", rest).order("position");
  let pos = count ?? 0;
  for (const im of imgs ?? []) await supabase.from("product_images").update({ product_id: main, position: pos++ }).eq("id", im.id);
  await supabase.from("products").delete().in("id", rest);
  refresh();
  return { ok: true };
}

/** Copia a estrutura de variações (nomes) de um produto para outros, sem copiar estoque. */
export async function copyVariants(input: { sourceId: string; targetIds: string[] }) {
  const { supabase } = await ctx();
  const { data: src } = await supabase.from("product_variants").select("name,position").eq("product_id", input.sourceId).order("position");
  if (!src?.length) return { error: "O produto de origem não tem variações." };
  for (const t of input.targetIds.filter((x) => x !== input.sourceId)) {
    await supabase.from("product_variants").delete().eq("product_id", t);
    await supabase.from("product_variants").insert(src.map((v) => ({ product_id: t, name: v.name, position: v.position })));
  }
  refresh();
  return { ok: true };
}

export async function toggleProduct(fd: FormData) {
  const { supabase } = await ctx();
  await supabase.from("products").update({ active: fd.get("active") === "true", auto_hidden: false }).eq("id", String(fd.get("id")));
  refresh();
}

export async function saveTemplate(fd: FormData) {
  const { supabase } = await ctx();
  const name = String(fd.get("name") ?? "").trim();
  const options = csvList(String(fd.get("options") ?? ""));
  if (!name || !options.length) return;
  await supabase.from("variation_templates").insert({ store_id: String(fd.get("store_id")), name, options });
  refresh();
}

export async function deleteTemplate(fd: FormData) {
  const { supabase } = await ctx();
  await supabase.from("variation_templates").delete().eq("id", String(fd.get("id")));
  refresh();
}

export async function duplicateProduct(fd: FormData) {
  const { supabase } = await ctx();
  const { data: p } = await supabase.from("products")
    .select("*, product_images(drive_file_id,position), product_variants(name,sku,barcode,price,stock,position,image_file_id)").eq("id", String(fd.get("id"))).single();
  if (!p) return;
  const { data: copy } = await supabase.from("products").insert({
    store_id: p.store_id, name: `${p.name} (cópia)`, sku: null, description: p.description, price: p.price,
    track_stock: p.track_stock, stock: p.stock, active: false, position: p.position + 1,
    category: p.category, tags: p.tags, low_stock_alert: p.low_stock_alert, hide_when_out: p.hide_when_out,
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

/** Lojista finaliza ou cancela (cancelar devolve o estoque reservado). */
export async function setOrderStatus(fd: FormData) {
  const { supabase } = await ctx();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  if (status === "finalizado") await supabase.rpc("finalize_order", { p_order: id });
  else if (status === "cancelado") await supabase.rpc("cancel_order", { p_order: id });
  refresh();
}

export async function signOut() {
  await (await supabaseServer()).auth.signOut();
  redirect("/");
}
