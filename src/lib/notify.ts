// Avisos push (somente servidor). Sem as chaves VAPID configuradas, tudo vira no-op e o app segue normal.
import webpush from "web-push";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { brlFmt, fmtDeliveryDate } from "@/lib/orders";

export type Payload = { title: string; body: string; url: string; tag?: string };
export type OrderEvent = "placed" | "approved" | "shipped" | "scheduled" | "delivered_by_owner" | "delivered_by_customer" | "canceled_by_owner" | "canceled_by_customer" | "returned";

let ready: boolean | null = null;
function init() {
  if (ready !== null) return ready;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, priv = process.env.VAPID_PRIVATE_KEY;
  ready = !!(pub && priv);
  if (ready) {
    try { webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:contato@expositor.app", pub!, priv!); }
    catch { ready = false; } // chave inválida: sem avisos, mas o app segue normal
  }
  return ready;
}

export async function pushTo(userId: string, payload: Payload) {
  if (!init()) return;
  try {
    const db = supabaseAdmin();
    const { data: subs } = await db.from("push_subscriptions").select("id,endpoint,p256dh,auth").eq("user_id", userId);
    await Promise.all((subs ?? []).map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), { TTL: 60 * 60 * 24 });
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) await db.from("push_subscriptions").delete().eq("id", s.id); // aparelho desinscrito
      }
    }));
  } catch { /* aviso é um extra: nunca derruba a ação principal */ }
}

type OrderRow = {
  code: number; total: number | null; customer_id: string; customer_name: string; store_id: string;
  delivery_date: string | null; delivery_note: string | null; cancel_reason: string | null; stores: { name: string; owner_id: string } | null;
};

/** Monta e envia o aviso certo para o dono ou para o cliente, conforme o que aconteceu no pedido. */
export async function notifyOrder(orderId: string, event: OrderEvent) {
  if (!init()) return;
  try {
    const { data } = await supabaseAdmin().from("orders")
      .select("code,total,customer_id,customer_name,store_id,delivery_date,delivery_note,cancel_reason,stores(name,owner_id)").eq("id", orderId).maybeSingle();
    const o = data as unknown as OrderRow | null;
    if (!o?.stores) return;
    const when = o.delivery_date ? `${fmtDeliveryDate(o.delivery_date)}${o.delivery_note ? ` (${o.delivery_note})` : ""}` : null;
    const why = o.cancel_reason ? ` Motivo: ${o.cancel_reason}.` : "";
    const store = o.stores.name, tag = `pedido-${o.code}`;
    const toOwner = (title: string, body: string) => pushTo(o.stores!.owner_id, { title, body, url: `/painel/${o.store_id}/pedidos`, tag });
    const toCustomer = (title: string, body: string) => pushTo(o.customer_id, { title, body, url: "/conta", tag });
    switch (event) {
      case "placed": return toOwner(`🛍️ Novo pedido #${o.code}`, `${o.customer_name}${o.total ? ` · ${brlFmt(o.total)}` : ""}`);
      case "approved": return toCustomer(`✅ Pedido #${o.code} aprovado`, `${store} aprovou o pedido e já está separando.${when ? ` Entrega prevista: ${when}.` : ""}`);
      case "shipped": return toCustomer(`🚚 Pedido #${o.code} a caminho`, `${store}${when ? ` — entrega prevista: ${when}` : ""}. Confirme o recebimento em Minha conta.`);
      case "scheduled": return toCustomer(`📅 Entrega do pedido #${o.code}`, when ? `${store} marcou a entrega para ${when}.` : `${store} atualizou a entrega.`);
      case "delivered_by_owner": return toCustomer(`✅ Pedido #${o.code} entregue`, `Obrigado! Que tal avaliar ${store}?`);
      case "delivered_by_customer": return toOwner(`✅ Entrega confirmada #${o.code}`, `${o.customer_name} confirmou o recebimento.`);
      case "canceled_by_owner": return toCustomer(`Pedido #${o.code} cancelado`, `${store} cancelou o pedido.${why} Os itens voltaram ao estoque.`);
      case "canceled_by_customer": return toOwner(`Pedido #${o.code} cancelado`, `${o.customer_name} cancelou o pedido.${why}`);
      case "returned": return toCustomer(`↩ Devolução do pedido #${o.code}`, `${store} registrou a devolução.`);
    }
  } catch { /* idem */ }
}
