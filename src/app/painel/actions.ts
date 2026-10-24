"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { nameFromFile } from "@/lib/google";
import { slugify, csvList, safeNext } from "@/lib/utils";
import { orderErrorMessage } from "@/lib/orders";
import { notifyOrder } from "@/lib/notify";
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
export async function importFiles(input: { storeId: string; mode: "each" | "group" | "add"; files: FileRef[]; groupName?: string; productId?: string; category?: string; subcategory?: string; tags?: string }) {
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
      store_id: store.id, position: pos + i, category: cat, subcategory: input.subcategory?.trim() || null, tags,
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

export async function bulkProducts(input: { ids: string[]; action: "delete" | "hide" | "show" | "category" | "subcategory" | "tags_add"; value?: string }) {
  const { supabase } = await ctx();
  if (!input.ids.length) return;
  if (input.action === "delete") await supabase.from("products").delete().in("id", input.ids);
  else if (input.action === "category") await supabase.from("products").update({ category: (input.value ?? "").trim() || null }).in("id", input.ids);
  else if (input.action === "subcategory") await supabase.from("products").update({ subcategory: (input.value ?? "").trim() || null }).in("id", input.ids);
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

const dateOf = (fd: FormData) => { const d = String(fd.get("date") ?? ""); return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null; };
const noteOf = (fd: FormData) => String(fd.get("note") ?? "").trim().slice(0, 200) || null;

/** Lojista: aprovar, enviar (em trânsito, com dia combinado opcional), marcar entregue/retirado ou cancelar (cancelar devolve o estoque reservado e guarda o motivo). */
export async function setOrderStatus(fd: FormData) {
  const { supabase } = await ctx();
  const id = String(fd.get("id"));
  const status = String(fd.get("status"));
  let error: { message: string } | null = null;
  if (status === "aprovado") ({ error } = await supabase.rpc("approve_order", { p_order: id }));
  else if (status === "enviado") ({ error } = await supabase.rpc("ship_order", { p_order: id, p_date: dateOf(fd), p_note: noteOf(fd) }));
  else if (status === "finalizado") ({ error } = await supabase.rpc("deliver_order", { p_order: id }));
  else if (status === "cancelado") ({ error } = await supabase.rpc("cancel_order", { p_order: id, p_reason: String(fd.get("reason") ?? "") }));
  if (!error) {
    const ev = { aprovado: "approved", enviado: "shipped", finalizado: "delivered_by_owner", cancelado: "canceled_by_owner" }[status] as "approved" | "shipped" | "delivered_by_owner" | "canceled_by_owner" | undefined;
    if (ev) after(() => notifyOrder(id, ev));
  }
  refresh();
}

/** Lojista combina ou altera o dia da entrega (e a janela, ex.: "entre 14h e 18h"); o cliente é avisado. */
export async function scheduleDelivery(fd: FormData) {
  const { supabase } = await ctx();
  const id = String(fd.get("id"));
  const date = dateOf(fd);
  if (!date) return;
  const { error } = await supabase.rpc("schedule_delivery", { p_order: id, p_date: date, p_note: noteOf(fd) });
  if (!error) after(() => notifyOrder(id, "scheduled"));
  refresh();
}

/** Devolução por item: campos qty_<item> (quantas voltaram) e descartar_<item> (não repor no estoque). */
export async function returnItems(fd: FormData) {
  const { supabase } = await ctx();
  const id = String(fd.get("id"));
  const back = safeNext(String(fd.get("back") ?? ""), "/painel");
  const returns: { item: string; qty: number; restock: boolean }[] = [];
  for (const [k, v] of fd.entries()) {
    if (!k.startsWith("qty_")) continue;
    const qty = Math.floor(Number(v));
    const item = k.slice(4);
    if (qty > 0) returns.push({ item, qty, restock: fd.get("descartar_" + item) == null });
  }
  const sep = back.includes("?") ? "&" : "?";
  if (!returns.length) redirect(`${back}${sep}erro=${encodeURIComponent("Informe quantas unidades voltaram.")}`);
  const { error } = await supabase.rpc("return_items", { p_order: id, p_returns: returns, p_reason: String(fd.get("reason") ?? "") });
  refresh();
  if (error) redirect(`${back}${sep}erro=${encodeURIComponent(orderErrorMessage(error.message))}`);
  after(() => notifyOrder(id, "returned"));
  redirect(`/painel/${String(fd.get("store"))}/pedidos?ok=${encodeURIComponent("Devolução registrada.")}`);
}

export async function signOut() {
  await (await supabaseServer()).auth.signOut();
  redirect("/");
}

// ---------- Fretes ----------
const money = (v: FormDataEntryValue | null) => { const n = num(v); return n != null && n >= 0 ? Math.round(n * 100) / 100 : null; };
const back = (store: string, tab: string, key: "ok" | "erro", msg: string): never => redirect(`/painel/${store}/${tab}?${key}=${encodeURIComponent(msg)}`);

/** Frete soma no total ou só informa; aceita retirada na loja. */
export async function saveShippingSettings(fd: FormData) {
  const { supabase } = await ctx();
  const store = String(fd.get("store"));
  const { error } = await supabase.from("stores").update({
    shipping_add_to_total: fd.get("add_to_total") === "1",
    pickup_enabled: fd.get("pickup") === "on",
  }).eq("id", store);
  refresh();
  if (error) back(store, "fretes", "erro", "Não foi possível salvar. Confira se a migração 012 foi aplicada.");
  back(store, "fretes", "ok", "Configurações de frete salvas.");
}

/** Cria ou atualiza uma regra de frete (cidade, estado ou demais locais). */
export async function saveShippingRule(fd: FormData) {
  const { supabase } = await ctx();
  const store = String(fd.get("store"));
  const id = String(fd.get("id") ?? "");
  const scope = String(fd.get("scope"));
  const mode = String(fd.get("mode"));
  const city = String(fd.get("city") ?? "").trim();
  const state = String(fd.get("state") ?? "").trim().toUpperCase().slice(0, 2);
  const fee = money(fd.get("fee"));
  const freeAbove = money(fd.get("free_above"));
  if (!["city", "state", "other"].includes(scope) || !["pago", "gratis", "combinar", "nao_entrega"].includes(mode)) back(store, "fretes", "erro", "Dados inválidos.");
  if (scope === "city" && !city) back(store, "fretes", "erro", "Informe a cidade.");
  if (scope === "state" && state.length !== 2) back(store, "fretes", "erro", "Escolha o estado.");
  if (mode === "pago" && fee == null) back(store, "fretes", "erro", "Informe o valor do frete.");
  const row = {
    scope, mode,
    city: scope === "city" ? city : null,
    state: scope === "other" ? null : state.length === 2 ? state : null,
    fee: mode === "pago" ? fee : null,
    free_above: mode === "pago" && freeAbove ? freeAbove : null,
    note: String(fd.get("note") ?? "").trim().slice(0, 120) || null,
  };
  const { error } = id
    ? await supabase.from("shipping_rules").update(row).eq("id", id).eq("store_id", store)
    : await supabase.from("shipping_rules").insert({ ...row, store_id: store, position: Math.floor(Date.now() / 1000) });
  refresh();
  if (error) back(store, "fretes", "erro", "Não foi possível salvar a regra: " + error.message);
  back(store, "fretes", "ok", id ? "Regra atualizada." : "Regra adicionada.");
}

export async function deleteShippingRule(fd: FormData) {
  const { supabase } = await ctx();
  const store = String(fd.get("store"));
  await supabase.from("shipping_rules").delete().eq("id", String(fd.get("id"))).eq("store_id", store);
  refresh();
  back(store, "fretes", "ok", "Regra removida.");
}

// ---------- Categorias ----------
/** Renomeia (ou junta, se o nome novo já existe) uma categoria, tipo/modelo ou tag em todos os produtos da loja. Nome novo vazio = remove. */
export async function renameLabel(fd: FormData) {
  const { supabase } = await ctx();
  const store = String(fd.get("store"));
  const kind = String(fd.get("kind"));
  const from = String(fd.get("from") ?? "");
  const to = String(fd.get("to") ?? "").trim();
  if (!from || !["category", "subcategory", "tag"].includes(kind)) back(store, "categorias", "erro", "Dados inválidos.");
  if (kind === "tag") {
    const { data } = await supabase.from("products").select("id,tags").eq("store_id", store).contains("tags", [from]);
    for (const p of data ?? []) {
      const tags = [...new Set((p.tags as string[]).map((t) => (t === from ? to : t)).filter(Boolean))];
      await supabase.from("products").update({ tags }).eq("id", p.id);
    }
  } else {
    const col = kind === "category" ? "category" : "subcategory";
    await supabase.from("products").update({ [col]: to || null }).eq("store_id", store).eq(col, from);
  }
  refresh();
  back(store, "categorias", "ok", to ? `"${from}" agora é "${to}".` : `"${from}" removido dos produtos.`);
}
