import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { brl, safeNext } from "@/lib/utils";
import ProfileForm from "./ProfileForm";
import ReviewForm from "./ReviewForm";
import { reviewStore, reviewProduct, cancelMyOrder, confirmDelivery } from "./actions";
import SubmitButton from "@/components/SubmitButton";
import NotifyButton from "@/components/NotifyButton";
import { cancelLine, deliveryLine, timeline } from "@/lib/orders";

const LABEL: Record<string, string> = { novo: "Aguardando a loja", aprovado: "Aprovado", enviado: "A caminho", finalizado: "Entregue", cancelado: "Cancelado", devolvido: "Devolvido" };
type Item = { id: string; product_id: string | null; name: string; variant_name?: string | null; price: number | null; qty: number; qty_returned: number };

export default async function Conta({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const supabase = await supabaseServer();
  await supabase.rpc("auto_deliver_orders");
  const { data: u } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
  const { data: orders, error: ordersError } = await supabase
    .from("orders").select("*, stores(name,slug), order_items(id,product_id,name,variant_name,price,qty,qty_returned)")
    .eq("customer_id", u.user!.id).order("created_at", { ascending: false }).limit(50);
  const ids = (orders ?? []).map((o) => o.id);
  const { data: sr } = ids.length ? await supabase.from("store_reviews").select("order_id").in("order_id", ids) : { data: [] };
  const itemIds = (orders ?? []).flatMap((o) => o.order_items.map((i: Item) => i.id));
  const { data: pr } = itemIds.length ? await supabase.from("product_reviews").select("order_item_id").in("order_item_id", itemIds) : { data: [] };
  const storeDone = new Set((sr ?? []).map((r) => r.order_id));
  const itemDone = new Set((pr ?? []).map((r) => r.order_item_id));

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <h1>Minha conta</h1>
        <div className="card acct">
          {(u.user!.user_metadata?.avatar_url ?? u.user!.user_metadata?.picture) && <img src={u.user!.user_metadata.avatar_url ?? u.user!.user_metadata.picture} alt="" referrerPolicy="no-referrer" />}
          <div><b>{u.user!.user_metadata?.full_name ?? u.user!.email}</b><br /><span className="muted">{u.user!.email} · conectado com Google</span></div>
          <Link className="btn" href="/painel">Ir para meus catálogos</Link>
        </div>
        <NotifyButton variant="card" hint="Receba um aviso quando o seu pedido sair para entrega e o dia combinado." />
        <h2>Meus dados para pedidos</h2>
        {!profile && <p className="muted">Complete seu cadastro para poder fazer pedidos. Seus dados são enviados apenas às lojas em que você pedir.</p>}
        <ProfileForm profile={profile} next={next ? safeNext(next) : undefined} defaultName={u.user!.user_metadata?.full_name} />

        <h2 style={{ marginTop: 32 }}>Meus pedidos</h2>
        {ordersError && <p className="err">Não foi possível carregar seus pedidos. Tente novamente em instantes.</p>}
        {!orders?.length && !ordersError && <p className="muted">Você ainda não fez pedidos.</p>}
        <div className="stack">
          {(orders ?? []).map((o) => (
            <div className="card prod" key={o.id}>
              <div className="between">
                <strong><Link href={`/${o.stores.slug}`}>{o.stores.name}</Link> · #{o.code}</strong>
                <span className={"status " + o.status}>{LABEL[o.status]}</span>
              </div>
              <p className="muted">{new Date(o.created_at).toLocaleString("pt-BR")}{o.total ? ` · ${brl(o.total)}` : ""}</p>
              {deliveryLine(o.delivery_date, o.delivery_note) && (o.status === "novo" || o.status === "aprovado" || o.status === "enviado") && (
                <p className="deliv">📅 Entrega prevista: <b>{deliveryLine(o.delivery_date, o.delivery_note)}</b></p>
              )}
              <p className="hist" aria-label="Histórico">{timeline(o).map((t) => <span key={t.label}>{t.label} {t.at}</span>)}</p>
              {o.status === "cancelado" && <p className="cancelinfo">✕ {cancelLine(o)}</p>}
              {o.delivery_type === "retirada"
                ? <p className="freteline"><span>🏬 Retirada na loja</span></p>
                : o.shipping_label && <p className="freteline"><span>🚚 {o.shipping_label}</span><b>{o.shipping_fee ? `${brl(o.shipping_fee)}${o.shipping_added ? "" : " (à parte)"}` : ""}</b></p>}
              <ul className="items">
                {o.order_items.map((i: Item) => (
                  <li key={i.id}>
                    {i.qty}× {i.name}{i.variant_name ? ` (${i.variant_name})` : ""}
                    {i.qty_returned > 0 && <small className="muted"> · {i.qty_returned} devolvido(s)</small>}
                    {o.status === "finalizado" && i.product_id && !itemDone.has(i.id) && (
                      <ReviewForm action={reviewProduct} fields={{ item_id: i.id }} label={`Avaliar ${i.name}`} />
                    )}
                    {itemDone.has(i.id) && <small className="ok"> ✓ avaliado</small>}
                  </li>
                ))}
              </ul>
              {o.status === "finalizado" && !storeDone.has(o.id) && (
                <ReviewForm action={reviewStore} fields={{ order_id: o.id }} label={`Avaliar a loja ${o.stores.name}`} />
              )}
              {o.status === "enviado" && (
                <>
                  <p className="muted">Seu pedido está a caminho. Ao receber, confirme abaixo — assim você pode avaliar a loja e os produtos. Se não confirmar, ele é marcado como entregue em 7 dias.</p>
                  <form action={confirmDelivery}><input type="hidden" name="id" value={o.id} /><SubmitButton className="btn sm primary" pendingText="Confirmando…" confirm="Confirmar que você recebeu este pedido?">Recebi meu pedido</SubmitButton></form>
                </>
              )}
              {o.status === "aprovado" && <p className="muted">A loja aprovou seu pedido e está preparando. Para cancelar agora, fale com a loja.</p>}
              {o.status === "novo" && (
                <>
                  <p className="muted">Combine pagamento e entrega pelo WhatsApp. Você poderá avaliar a loja e os produtos depois que o pedido for entregue.</p>
                  <details className="cancelbox">
                    <summary className="muted">Cancelar este pedido…</summary>
                    <form action={cancelMyOrder}>
                      <input type="hidden" name="id" value={o.id} />
                      <select name="reason" aria-label="Motivo do cancelamento" defaultValue="">
                        <option value="">Motivo (opcional)</option>
                        <option>Mudei de ideia</option><option>Pedi por engano</option><option>Encontrei mais barato</option><option>Demora para responder</option>
                      </select>
                      <SubmitButton className="btn sm danger" pendingText="Cancelando…" confirm="Cancelar este pedido? A loja será avisada.">Cancelar pedido</SubmitButton>
                    </form>
                  </details>
                </>
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
