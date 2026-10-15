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
    for (const g of groups) {
      const name = input.mode === "group" && input.groupName?.trim() ? input.groupName.trim() : nameFromFile(g[0].name);
      const { data: p, error } = await supabase
        .from("products").insert({ store_id: store.id, name, position: pos++ }).select("id").single();
      if (error || !p) return { error: error?.message ?? "Erro ao criar produto." };
      const { error: e2 } = await supabase.from("product_images").insert(
        g.map((f, i) => ({ product_id: p.id, drive_file_id: f.id, position: i })),
      );
      if (e2) return { error: e2.message };
    }
  }
  refresh();
  return { ok: true };
}

export async function updateProduct(fd: FormData) {
  const { supabase } = await ctx();
  const price = String(fd.get("price") ?? "").replace(/\./g, "").replace(",", ".").trim();
  const track = fd.get("track_stock") === "on";
  await supabase.from("products").update({
    name: String(fd.get("name") ?? "").trim() || "Sem nome",
    description: String(fd.get("description") ?? "").trim() || null,
    price: price && !isNaN(Number(price)) ? Number(price) : null,
    track_stock: track,
    stock: track ? Math.max(0, parseInt(String(fd.get("stock") ?? "0"), 10) || 0) : null,
    active: fd.get("active") === "on",
  }).eq("id", String(fd.get("id")));
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
    const { data: items } = await supabase.from("order_items").select("product_id,qty").eq("order_id", id);
    for (const it of items ?? []) {
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
