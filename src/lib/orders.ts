// Lógica pura de pedidos (sem dependências do Next) — usada pelas Server Actions e pelos testes.

export const brlFmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type OrderLine = { name: string; variant: string | null; price: number | null; qty: number };
export type PlacedOrder = {
  order_id: string; code: number; total: number; lines: OrderLine[];
  subtotal?: number; shipping_fee?: number | null; shipping_label?: string | null; shipping_added?: boolean; delivery_type?: "entrega" | "retirada";
  customer_name: string; customer_phone: string; address: string; whatsapp: string | null;
  store_name: string; notes: string | null;
};

/** Mensagem pronta do WhatsApp (formatação *negrito* do próprio WhatsApp). */
export function buildOrderMessage(o: PlacedOrder): string {
  const unpriced = o.lines.some((l) => l.price == null);
  return [
    `🛍️ *Novo pedido #${o.code}* — ${o.store_name}`,
    "",
    "*Itens*",
    ...o.lines.map((l, i) => {
      const label = `${i + 1}. ${l.qty}x ${l.name}${l.variant ? ` (${l.variant})` : ""}`;
      if (l.price == null) return `${label} — sob consulta`;
      return `${label} — ${brlFmt(l.price * l.qty)}${l.qty > 1 ? ` (${brlFmt(l.price)} cada)` : ""}`;
    }),
    "",
    ...shippingLines(o),
    ...(o.total > 0 ? [`💰 *Total: ${brlFmt(o.total)}*${unpriced ? " (+ itens sob consulta)" : ""}`, ""] : []),
    `👤 *Cliente:* ${o.customer_name}`,
    `📞 *Telefone:* ${o.customer_phone}`,
    o.delivery_type === "retirada" ? "🏬 *Retirada na loja*" : `📍 *Endereço:* ${o.address}`,
    ...(o.notes ? [`📝 *Obs.:* ${o.notes}`] : []),
    "",
    "Aguardo a confirmação. Obrigado!",
  ].join("\n");
}

/** Linha do frete na mensagem: soma no total, só informa, grátis, retirada ou a combinar. */
function shippingLines(o: PlacedOrder): string[] {
  if (o.delivery_type === "retirada") return [];
  const fee = o.shipping_fee;
  if (fee == null) return [`🚚 *Frete:* a combinar`, ""];
  if (fee === 0) return [`🚚 *Frete:* grátis`, ""];
  return [`🚚 *Frete:* ${brlFmt(fee)}${o.shipping_added ? " (incluído no total)" : " (cobrado à parte)"}`, ""];
}

/** Link wa.me: aceita número com ou sem DDI (sem DDI assume Brasil, 55). */
export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length <= 11 ? "55" + digits : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

/** Converte os erros da função place_order do banco em mensagens para o cliente. */
export function orderErrorMessage(raw: string): string {
  const [code, detail] = raw.replace(/^.*?(AUTH|PROFILE|STORE|EMPTY|ITEM|VARIANT|STOCK|QTY|STATUS|FORBIDDEN|ORDER|PICKUP|NODELIVERY)/s, "$1").split("|");
  switch (code) {
    case "AUTH": return "Entre na sua conta para fazer o pedido.";
    case "PROFILE": return "Complete seu cadastro (nome, telefone e endereço) para pedir.";
    case "STORE": return "Loja não encontrada.";
    case "EMPTY": return "Seu pedido está vazio.";
    case "ITEM": return "Algum item não está mais disponível. Atualize a página.";
    case "VARIANT": return `Escolha uma opção para "${detail?.trim()}".`;
    case "STOCK": return `Estoque insuficiente para "${detail?.trim()}".`;
    case "QTY": return `A quantidade devolvida de "${detail?.trim()}" é maior que a do pedido.`;
    case "STATUS": return "O pedido não está mais nessa etapa. Atualize a página.";
    case "FORBIDDEN": return "Você não tem permissão para isso.";
    case "ORDER": return "Pedido não encontrado.";
    case "PICKUP": return "Esta loja não oferece retirada.";
    case "NODELIVERY": return `A loja não entrega em ${detail?.trim() || "seu endereço"}. Veja se ela oferece retirada ou fale com ela.`;
    default: return "Não foi possível registrar o pedido. Tente novamente.";
  }
}

const firstName = (n: string) => n.trim().split(/\s+/)[0] ?? n;

/** Mensagem do lojista para o cliente, conforme a situação do pedido. */
export function buildStoreReply(o: { code: number; status: string; customer_name: string; total: number | null; delivery_date?: string | null; delivery_note?: string | null; canceled_by?: string | null; cancel_reason?: string | null }, storeName: string): string {
  const when = deliveryLine(o.delivery_date, o.delivery_note);
  const day = when ? `\n📅 *Entrega prevista:* ${when}` : "";
  const hi = `Olá, ${firstName(o.customer_name)}! `;
  const total = o.total ? ` (${brlFmt(o.total)})` : "";
  switch (o.status) {
    case "enviado":
      return `${hi}Seu pedido #${o.code}${total} na *${storeName}* saiu para entrega. 🚚${day}\nQuando receber, confirme em "Minha conta" no catálogo. Qualquer dúvida é só falar por aqui.`;
    case "finalizado":
      return `${hi}Seu pedido #${o.code}${total} na *${storeName}* foi entregue. ✅\nObrigado pela compra! Se puder, avalie a loja em "Minha conta" — sua opinião ajuda muito. 💚`;
    case "devolvido":
      return `${hi}Registramos a devolução do pedido #${o.code} na *${storeName}*. Se precisar de algo mais, é só chamar.`;
    case "cancelado": {
      const why = o.cancel_reason ? `\nMotivo: ${o.cancel_reason}.` : "";
      if (o.canceled_by === "cliente") return `${hi}Recebemos o cancelamento do seu pedido #${o.code} na *${storeName}*.${why}\nSe mudar de ideia, é só fazer um novo pedido.`;
      return `${hi}Seu pedido #${o.code} na *${storeName}* foi cancelado.${why}\nOs itens voltaram ao estoque. Se quiser, é só fazer um novo pedido ou falar com a gente por aqui.`;
    }
    case "aprovado":
      return `${hi}Seu pedido #${o.code}${total} na *${storeName}* foi aprovado. ✅\nJá estamos separando tudo.${day}`;
    default:
      return `${hi}Recebemos seu pedido #${o.code}${total} na *${storeName}*. ✅\nJá estamos separando tudo e logo combinamos pagamento e entrega por aqui.${day}`;
  }
}

/** "há 5 min", "há 3 h", "há 2 dias" */
export function timeAgo(iso: string, now = Date.now()): string {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 1) return "agora há pouco";
  if (m < 60) return `há ${m} min`;
  if (m < 1440) return `há ${Math.floor(m / 60)} h`;
  const d = Math.floor(m / 1440);
  return `há ${d} ${d === 1 ? "dia" : "dias"}`;
}

/** Hoje no Brasil, como AAAA-MM-DD (para comparar com a data de entrega). */
export const todayBR = (now = new Date()) => now.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" });

/** "2026-10-31" → "sex., 31/10" (data pura, sem fuso). */
export function fmtDeliveryDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("pt-BR", { weekday: "short", timeZone: "UTC" });
  return `${wd}, ${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}`;
}

/** Texto "Entrega: sex., 31/10 (entre 14h e 18h)" ou null sem data. */
export function deliveryLine(date: string | null | undefined, note?: string | null): string | null {
  return date ? `${fmtDeliveryDate(date)}${note ? ` (${note})` : ""}` : null;
}

/** "Cancelado pela loja em 24/10 às 14:30 — motivo: …" (null se não foi cancelado). */
export function cancelLine(o: { status: string; canceled_by?: string | null; canceled_at?: string | null; cancel_reason?: string | null }): string | null {
  if (o.status !== "cancelado") return null;
  const who = o.canceled_by === "cliente" ? "pelo cliente" : o.canceled_by === "loja" ? "pela loja" : "";
  const when = o.canceled_at ? new Date(o.canceled_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).replace(",", " às") : "";
  return `Cancelado ${who}${when ? ` em ${when}` : ""}${o.cancel_reason ? ` — motivo: ${o.cancel_reason}` : ""}`.replace("Cancelado  ", "Cancelado ");
}

type Stamps = { created_at: string; approved_at?: string | null; shipped_at?: string | null; finished_at?: string | null; canceled_at?: string | null; status: string };
/** Linha do tempo do pedido para mostrar o histórico (pedido → aprovado → enviado → entregue/cancelado). */
export function timeline(o: Stamps): { label: string; at: string }[] {
  const out: { label: string; at: string | null | undefined }[] = [
    { label: "Pedido feito", at: o.created_at }, { label: "Aprovado", at: o.approved_at }, { label: "Enviado", at: o.shipped_at },
    { label: "Entregue", at: o.finished_at }, { label: "Cancelado", at: o.canceled_at },
  ];
  const f = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
  return out.filter((x): x is { label: string; at: string } => !!x.at).map((x) => ({ label: x.label, at: f(x.at) }));
}
