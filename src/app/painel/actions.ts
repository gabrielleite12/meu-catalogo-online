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
  const { data: store } = await supabase.from("stores").select("id,slug").eq("owner_id", data.user.id).maybeSingle();
  return { supabase, user: data.user, store };
}

const list = (v: FormDataEntryValue | null) =>
  String(v ?? "").split(",").map((s) => s.trim()).filter(Boolean);

export async function saveStore(_: unknown, fd: FormData): Promise<{ error?: string; ok?: boolean }> {
  const { supabase, user, store } = await ctx();
  const name = String(fd.get("name") ?? "").trim();
  const slug = slugify(String(fd.get("slug") || name));
  if (!name) return { error: "Informe o nome da loja." };
  if (slug.length < 3) return { error: "O endereço precisa ter ao menos 3 letras." };
  const row = {
    owner_id: user.id,
    name,
    slug,
    category: String(fd.get("category") ?? "").trim() || null,
    description: String(fd.get("description") ?? "").trim() || null,
    city: String(fd.get("city") ?? "").trim() || null,
    whatsapp: String(fd.get("whatsapp") ?? "").replace(/\D/g, "") || null,
    payment_methods: list(fd.get("payment_methods")),
    delivery_methods: list(fd.get("delivery_methods")),
    published: fd.get("published") === "on",
  };
  const q = store
    ? supabase.from("stores").update(row).eq("id", store.id)
    : supabase.from("stores").insert(row);
  const { error } = await q;
  if (error) return { error: error.code === "23505" ? "Esse endereço já está em uso." : error.message };
  revalidatePath("/painel");
  revalidatePath(`/${slug}`);
  return { ok: true };
}

type FileRef = { id: string; name: string };

/** mode: each = um produto por foto · group = várias fotos num produto · add = fotos em produto existente */
export async function importFiles(input: { mode: "each" | "group" | "add"; files: FileRef[]; groupName?: string; productId?: string }) {
  const { supabase, store } = await ctx();
  if (!store) return { error: "Crie sua loja primeiro." };
  if (!input.files.length) return { error: "Selecione ao menos uma foto." };

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
  revalidatePath("/painel/produtos");
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
  revalidatePath("/painel/produtos");
}

export async function deleteProduct(fd: FormData) {
  const { supabase } = await ctx();
  await supabase.from("products").delete().eq("id", String(fd.get("id")));
  revalidatePath("/painel/produtos");
}

export async function removeImage(fd: FormData) {
  const { supabase } = await ctx();
  await supabase.from("product_images").delete().eq("id", String(fd.get("id")));
  revalidatePath("/painel/produtos");
}

export async function signOut() {
  await (await supabaseServer()).auth.signOut();
  redirect("/");
}
