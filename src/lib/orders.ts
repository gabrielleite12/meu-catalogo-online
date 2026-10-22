// Lógica pura de pedidos (sem dependências do Next) — usada pelas Server Actions e pelos testes.

export const brlFmt = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type OrderLine = { name: string; variant: string | null; price: number | null; qty: number };
export type PlacedOrder = {
  order_id: string; code: number; total: number; lines: OrderLine[];
  customer_name: string; customer_phone: string; address: string; whatsapp: string | null;
  store_name: string; notes: string | null;
};

/** Mensagem pronta do WhatsApp (formatação *negrito* do próprio WhatsApp). */
export function buildOrderMessage(o: PlacedOrder): string {
  const unpriced = o.lines.some((l) => l.price == null);
  return [
    `Olá! Gostaria de fazer o pedido #${o.code} na *${o.store_name}*:`,
    "",
    ...o.lines.map((l) =>
      `• ${l.qty}x ${l.name}${l.variant ? ` (${l.variant})` : ""}${l.price != null ? ` — ${brlFmt(l.price * l.qty)}` : " — sob consulta"}`),
    "",
    ...(o.total > 0 ? [`*Total:* ${brlFmt(o.total)}${unpriced ? " (+ itens sob consulta)" : ""}`] : []),
    `*Cliente:* ${o.customer_name} (${o.customer_phone})`,
    `*Endereço:* ${o.address}`,
    ...(o.notes ? [`*Obs.:* ${o.notes}`] : []),
  ].join("\n");
}

/** Link wa.me: aceita número com ou sem DDI (sem DDI assume Brasil, 55). */
export function whatsappLink(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  const full = digits.length <= 11 ? "55" + digits : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

/** Converte os erros da função place_order do banco em mensagens para o cliente. */
export function orderErrorMessage(raw: string): string {
  const [code, detail] = raw.replace(/^.*?(AUTH|PROFILE|STORE|EMPTY|ITEM|VARIANT|STOCK)/s, "$1").split("|");
  switch (code) {
    case "AUTH": return "Entre na sua conta para fazer o pedido.";
    case "PROFILE": return "Complete seu cadastro (nome, telefone e endereço) para pedir.";
    case "STORE": return "Loja não encontrada.";
    case "EMPTY": return "Seu pedido está vazio.";
    case "ITEM": return "Algum item não está mais disponível. Atualize a página.";
    case "VARIANT": return `Escolha uma opção para "${detail?.trim()}".`;
    case "STOCK": return `Estoque insuficiente para "${detail?.trim()}".`;
    default: return "Não foi possível registrar o pedido. Tente novamente.";
  }
}
