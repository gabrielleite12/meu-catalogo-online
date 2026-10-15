"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { brl } from "@/lib/utils";

type Result = { error?: string; link?: string };

export async function placeOrder(input: { slug: string; items: { id: string; qty: number }[]; notes?: string }): Promise<Result> {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return { error: "Entre na sua conta para fazer o pedido." };
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
  if (!profile) return { error: "Complete seu cadastro (nome, telefone e endereço) para pedir." };

  const { data: store } = await supabase.from("stores").select("id,name,whatsapp,published").eq("slug", input.slug).maybeSingle();
  if (!store || !store.published) return { error: "Loja não encontrada." };
  if (!store.whatsapp) return { error: "Esta loja ainda não informou um WhatsApp." };

  const wanted = input.items.filter((i) => i.qty > 0).slice(0, 100);
  if (!wanted.length) return { error: "Seu pedido está vazio." };
  const { data: products } = await supabase.from("products")
    .select("id,name,price,track_stock,stock").eq("store_id", store.id).eq("active", true).in("id", wanted.map((w) => w.id));
  const byId = new Map((products ?? []).map((p) => [p.id, p]));

  const lines: { p: NonNullable<typeof products>[number]; qty: number }[] = [];
  for (const w of wanted) {
    const p = byId.get(w.id);
    if (!p) return { error: "Algum item não está mais disponível. Atualize a página." };
    const qty = Math.min(Math.floor(w.qty), 999);
    if (p.track_stock && qty > (p.stock ?? 0)) return { error: `Estoque insuficiente para "${p.name}".` };
    lines.push({ p, qty });
  }
  const total = lines.reduce((a, l) => a + (l.p.price ?? 0) * l.qty, 0);
  const address = [
    `${profile.street}, ${profile.number}`, profile.complement, profile.district,
    `${profile.city}/${profile.state}`, profile.zip,
  ].filter(Boolean).join(" - ");
  const notes = (input.notes ?? "").trim().slice(0, 500) || null;

  const { data: order, error } = await supabase.from("orders").insert({
    store_id: store.id, customer_id: u.user.id, customer_name: profile.name,
    customer_phone: profile.phone, customer_address: address, notes, total: total || null,
  }).select("id,code").single();
  if (error || !order) return { error: "Não foi possível registrar o pedido." };

  const { error: e2 } = await supabase.from("order_items").insert(
    lines.map((l) => ({ order_id: order.id, product_id: l.p.id, name: l.p.name, price: l.p.price, qty: l.qty })),
  );
  if (e2) return { error: "Não foi possível registrar os itens do pedido." };

  const text = [
    `Olá! Gostaria de fazer o pedido #${order.code} na *${store.name}*:`, "",
    ...lines.map((l) => `• ${l.qty}x ${l.p.name}${l.p.price != null ? ` — ${brl(l.p.price * l.qty)}` : ""}`), "",
    ...(total > 0 ? [`*Total:* ${brl(total)}`] : []),
    `*Cliente:* ${profile.name} (${profile.phone})`,
    `*Endereço:* ${address}`,
    ...(notes ? [`*Obs.:* ${notes}`] : []),
  ].join("\n");
  const phone = store.whatsapp.length <= 11 ? "55" + store.whatsapp : store.whatsapp;
  return { link: `https://wa.me/${phone}?text=${encodeURIComponent(text)}` };
}
