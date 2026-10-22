"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { buildOrderMessage, orderErrorMessage, whatsappLink, type PlacedOrder } from "@/lib/orders";

type Result = { error?: string; link?: string };

export async function placeOrder(input: { slug: string; items: { id: string; variantId?: string; qty: number }[]; notes?: string }): Promise<Result> {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "Entre na sua conta para fazer o pedido." };

  const { data: store } = await supabase.from("stores").select("id,whatsapp,published").eq("slug", input.slug).maybeSingle();
  if (!store || !store.published) return { error: "Loja não encontrada." };
  if (!store.whatsapp) return { error: "Esta loja ainda não informou um WhatsApp." };

  // confere preços e estoque e reserva as unidades, tudo de forma atômica no banco
  const { data, error } = await supabase.rpc("place_order", {
    p_store: store.id,
    p_items: input.items.filter((i) => i.qty > 0).map((i) => ({ id: i.id, variantId: i.variantId ?? "", qty: Math.floor(i.qty) })),
    p_notes: input.notes ?? null,
  });
  if (error || !data) return { error: orderErrorMessage(error?.message ?? "") };

  const order = data as PlacedOrder;
  return { link: whatsappLink(store.whatsapp, buildOrderMessage(order)) };
}
