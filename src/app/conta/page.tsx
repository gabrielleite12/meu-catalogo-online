import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { brl, safeNext } from "@/lib/utils";
import ProfileForm from "./ProfileForm";
import ReviewForm from "./ReviewForm";
import { reviewStore, reviewProduct } from "./actions";

const LABEL: Record<string, string> = { novo: "Aguardando a loja", finalizado: "Finalizado", cancelado: "Cancelado" };
type Item = { id: string; product_id: string | null; name: string; variant_name?: string | null; price: number | null; qty: number };

export default async function Conta({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", u.user!.id).maybeSingle();
  const { data: orders } = await supabase
    .from("orders").select("*, stores(name,slug), order_items(id,product_id,name,variant_name,price,qty)")
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
        <h2>Meus dados para pedidos</h2>
        {!profile && <p className="muted">Complete seu cadastro para poder fazer pedidos. Seus dados são enviados apenas às lojas em que você pedir.</p>}
        <ProfileForm profile={profile} next={next ? safeNext(next) : undefined} defaultName={u.user!.user_metadata?.full_name} />

        <h2 style={{ marginTop: 32 }}>Meus pedidos</h2>
        {!orders?.length && <p className="muted">Você ainda não fez pedidos.</p>}
        <div className="stack">
          {(orders ?? []).map((o) => (
            <div className="card prod" key={o.id}>
              <div className="between">
                <strong><Link href={`/${o.stores.slug}`}>{o.stores.name}</Link> · #{o.code}</strong>
                <span className={"status " + o.status}>{LABEL[o.status]}</span>
              </div>
              <p className="muted">{new Date(o.created_at).toLocaleString("pt-BR")}{o.total ? ` · ${brl(o.total)}` : ""}</p>
              <ul className="items">
                {o.order_items.map((i: Item) => (
                  <li key={i.id}>
                    {i.qty}× {i.name}{i.variant_name ? ` (${i.variant_name})` : ""}
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
              {o.status === "novo" && <p className="muted">Você poderá avaliar a loja e os produtos depois que a loja marcar o pedido como finalizado.</p>}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
