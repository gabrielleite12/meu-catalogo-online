"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { brl, imgUrl, type Product, type Variant } from "@/lib/utils";
import { avail, key, priceOf, vars } from "@/lib/catalog";
import { placeOrder } from "@/app/[slug]/actions";
import { quoteShipping, type ShippingRule } from "@/lib/shipping";

type StoreInfo = { slug: string; name: string; whatsapp: string | null };
type Viewer = { loggedIn: boolean; hasProfile: boolean; city?: string | null; state?: string | null };
type Shipping = { rules: ShippingRule[]; addToTotal: boolean; pickup: boolean };
type Ctx = {
  store: StoreInfo; products: Product[];
  qty: (p: Product, v?: Variant) => number;
  set: (p: Product, v: Variant | undefined, n: number) => void;
  add: (p: Product, v?: Variant, n?: number) => void;
  count: number; total: number; openCart: () => void;
};
const CartCtx = createContext<Ctx | null>(null);
export const useStoreCart = () => {
  const c = useContext(CartCtx);
  if (!c) throw new Error("useStoreCart fora do StoreCart");
  return c;
};

/** Carrinho da loja: guarda no navegador, compartilhado entre a vitrine e a página do produto. */
export default function StoreCart({ store, products, viewer, shipping, floatingBar = true, children }: {
  store: StoreInfo; products: Product[]; viewer: Viewer; shipping: Shipping; floatingBar?: boolean; children: React.ReactNode;
}) {
  const storageKey = `cart2:${store.slug}`;
  const [cart, setCart] = useState<Record<string, number>>({});
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const [obs, setObs] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [pickup, setPickup] = useState(false);

  useEffect(() => { try { setCart(JSON.parse(localStorage.getItem(storageKey) || "{}")); } catch {} setReady(true); }, [storageKey]);
  useEffect(() => { if (ready) try { localStorage.setItem(storageKey, JSON.stringify(cart)); } catch {} }, [cart, storageKey, ready]);

  const qty = useCallback((p: Product, v?: Variant) => cart[key(p, v)] ?? 0, [cart]);
  const set = useCallback((p: Product, v: Variant | undefined, n: number) =>
    setCart((c) => { const x = { ...c }; const val = Math.max(0, Math.min(n, avail(p, v))); val ? (x[key(p, v)] = val) : delete x[key(p, v)]; return x; }), []);
  const add = useCallback((p: Product, v?: Variant, n = 1) => set(p, v, (cart[key(p, v)] ?? 0) + n), [set, cart]);

  const lines = useMemo(() => {
    const out: { p: Product; v?: Variant; n: number }[] = [];
    for (const p of products) {
      const vs = vars(p);
      if (vs.length) vs.forEach((v) => { const n = Math.min(cart[key(p, v)] ?? 0, avail(p, v)); if (n > 0) out.push({ p, v, n }); });
      else { const n = Math.min(cart[key(p)] ?? 0, avail(p)); if (n > 0) out.push({ p, n }); }
    }
    return out;
  }, [cart, products]);
  const count = lines.reduce((a, l) => a + l.n, 0);
  const total = lines.reduce((a, l) => a + (priceOf(l.p, l.v) ?? 0) * l.n, 0);

  // frete conforme a cidade/estado do cadastro do cliente (o valor definitivo é calculado no servidor ao enviar)
  const quote = useMemo(() => quoteShipping(shipping.rules, { city: viewer.city, state: viewer.state }, total), [shipping.rules, viewer.city, viewer.state, total]);
  const usePickup = pickup && shipping.pickup;
  const blocked = !usePickup && quote.mode === "nao_entrega";
  const fee = usePickup ? 0 : quote.fee;
  const finalTotal = total + (shipping.addToTotal && fee ? fee : 0);

  async function send() {
    setErr(""); setSending(true);
    const win = window.open("", "_blank");
    const r = await placeOrder({ slug: store.slug, items: lines.map((l) => ({ id: l.p.id, variantId: l.v?.id, qty: l.n })), notes: obs, pickup: usePickup });
    setSending(false);
    if (!r.link) { win?.close(); return setErr(r.error ?? "Erro ao enviar."); }
    setCart({}); setOpen(false);
    if (win) win.location.href = r.link; else window.location.href = r.link;
  }

  const thumb = (p: Product, v?: Variant) => {
    const f = v?.image_file_id ?? [...p.product_images].sort((a, b) => a.position - b.position)[0]?.drive_file_id;
    return f ? imgUrl(f) + "?s=120" : null;
  };

  return (
    <CartCtx.Provider value={{ store, products, qty, set, add, count, total, openCart: () => setOpen(true) }}>
      {children}
      {floatingBar && count > 0 && (
        <button className="cartbar" onClick={() => setOpen(true)}>🛒 Ver pedido · {count} {count === 1 ? "item" : "itens"}{total > 0 && ` · ${brl(total)}`}</button>
      )}
      {open && (
        <div className="overlay" onClick={() => setOpen(false)}>
          <aside className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="between"><h2>Seu pedido</h2><button className="btn ghost" onClick={() => setOpen(false)}>Fechar</button></div>
            {!lines.length && <p className="muted">Seu pedido está vazio.</p>}
            {lines.map(({ p, v, n }) => (
              <div className="line cl" key={key(p, v)}>
                <span className="cthumb">{thumb(p, v) && <img src={thumb(p, v)!} alt="" />}</span>
                <span className="cinfo">
                  <Link href={`/${store.slug}/p/${p.id}`} onClick={() => setOpen(false)}>{p.name}</Link>
                  {v && <small className="muted">{v.name}</small>}
                  <small className="muted">{priceOf(p, v) != null ? brl(priceOf(p, v)!) : "Sob consulta"}</small>
                </span>
                <span className="qty">
                  <button onClick={() => set(p, v, n - 1)} aria-label="menos">−</button><b>{n}</b>
                  <button onClick={() => set(p, v, n + 1)} disabled={n >= avail(p, v)} aria-label="mais">+</button>
                </span>
              </div>
            ))}
            <div className="shipbox">
              {shipping.pickup && (
                <div className="pick">
                  <label><input type="radio" checked={!usePickup} onChange={() => setPickup(false)} /> Receber em casa</label>
                  <label><input type="radio" checked={usePickup} onChange={() => setPickup(true)} /> Retirar na loja</label>
                </div>
              )}
              <div className="freteline">
                <span>🚚 {usePickup ? "Retirada na loja" : quote.label}{!usePickup && quote.note ? <small className="muted block">{quote.note}</small> : null}</span>
                <b>{usePickup ? "grátis" : quote.mode === "pago" ? brl(quote.fee ?? 0) : quote.mode === "gratis" ? "grátis" : ""}</b>
              </div>
              {!usePickup && quote.mode === "pago" && !shipping.addToTotal && <small className="muted">Cobrado à parte, não entra no total abaixo.</small>}
              {!usePickup && viewer.loggedIn && !viewer.city && <small className="muted block">Complete seu endereço em Minha conta para calcular o frete.</small>}
              {blocked && <p className="err">A loja não entrega {viewer.city ? `em ${viewer.city}` : "neste endereço"}.{shipping.pickup ? " Escolha retirar na loja." : " Fale com ela pelo WhatsApp."}</p>}
            </div>
            <div className="between total"><span>Total</span><b>{finalTotal > 0 ? brl(finalTotal) : "—"}</b></div>
            <div className="form">
              <label>Observações<textarea rows={2} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Forma de pagamento, retirada, horário…" /></label>
            </div>
            {err && <p className="err">{err}</p>}
            {!store.whatsapp ? <p className="err">Esta loja ainda não informou um WhatsApp.</p>
              : !viewer.loggedIn ? <Link className="btn primary block" href={`/login?next=/${store.slug}`}>Entrar para fazer o pedido</Link>
              : !viewer.hasProfile ? <Link className="btn primary block" href={`/conta?next=/${store.slug}`}>Completar cadastro para pedir</Link>
              : <button className="btn whats block" disabled={sending || !lines.length || blocked} onClick={send}>{sending ? "Enviando…" : "Enviar pedido pelo WhatsApp"}</button>}
            <small className="muted">Seu nome, telefone e endereço cadastrados vão junto com o pedido.</small>
            <button className="link" onClick={() => setCart({})}>Limpar pedido</button>
          </aside>
        </div>
      )}
    </CartCtx.Provider>
  );
}
