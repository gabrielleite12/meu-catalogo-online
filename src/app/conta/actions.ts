"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { safeNext } from "@/lib/utils";

type State = { error?: string; ok?: boolean };
const s = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

async function ctx() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login?next=/conta");
  return { supabase, user: data.user };
}

export async function saveProfile(_: unknown, fd: FormData): Promise<State> {
  const { supabase, user } = await ctx();
  const row = {
    id: user.id,
    name: s(fd, "name"), phone: s(fd, "phone").replace(/[^\d+]/g, ""),
    zip: s(fd, "zip") || null, street: s(fd, "street"), number: s(fd, "number"),
    complement: s(fd, "complement") || null, district: s(fd, "district") || null,
    city: s(fd, "city"), state: s(fd, "state").toUpperCase().slice(0, 2),
  };
  if (!row.name || row.phone.length < 10 || !row.street || !row.number || !row.city || row.state.length !== 2)
    return { error: "Preencha nome, WhatsApp com DDD, rua, número, cidade e UF." };
  const { error } = await supabase.from("profiles").upsert(row);
  if (error) return { error: error.message };
  revalidatePath("/conta");
  const next = fd.get("next");
  if (next) redirect(safeNext(String(next), "/conta"));
  return { ok: true };
}

export async function reviewStore(_: unknown, fd: FormData): Promise<State> {
  const { supabase, user } = await ctx();
  const rating = Number(fd.get("rating"));
  if (!(rating >= 1 && rating <= 5)) return { error: "Escolha de 1 a 5 estrelas." };
  const { data: order } = await supabase.from("orders").select("id,store_id,customer_name").eq("id", s(fd, "order_id")).maybeSingle();
  if (!order) return { error: "Pedido não encontrado." };
  const { error } = await supabase.from("store_reviews").insert({
    store_id: order.store_id, order_id: order.id, customer_id: user.id,
    reviewer_name: order.customer_name.split(" ")[0], rating, comment: s(fd, "comment").slice(0, 1000) || null,
  });
  if (error) return { error: error.code === "23505" ? "Você já avaliou esta loja neste pedido." : "Só é possível avaliar pedidos finalizados." };
  revalidatePath("/conta");
  return { ok: true };
}

export async function reviewProduct(_: unknown, fd: FormData): Promise<State> {
  const { supabase, user } = await ctx();
  const rating = Number(fd.get("rating"));
  if (!(rating >= 1 && rating <= 5)) return { error: "Escolha de 1 a 5 estrelas." };
  const { data: item } = await supabase.from("order_items")
    .select("id,product_id,orders(customer_name)").eq("id", s(fd, "item_id")).maybeSingle();
  if (!item?.product_id) return { error: "Produto não disponível para avaliação." };
  // @ts-expect-error relação aninhada
  const name: string = item.orders?.customer_name ?? "Cliente";
  const { error } = await supabase.from("product_reviews").insert({
    product_id: item.product_id, order_item_id: item.id, customer_id: user.id,
    reviewer_name: name.split(" ")[0], rating, comment: s(fd, "comment").slice(0, 1000) || null,
  });
  if (error) return { error: error.code === "23505" ? "Você já avaliou este item." : "Só é possível avaliar pedidos finalizados." };
  revalidatePath("/conta");
  return { ok: true };
}

export async function cancelMyOrder(fd: FormData) {
  const { supabase } = await ctx();
  await supabase.rpc("cancel_order", { p_order: String(fd.get("id")) });
  revalidatePath("/conta");
}
