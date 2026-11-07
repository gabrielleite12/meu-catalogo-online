import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import { loadStorefront } from "@/lib/storefront";
import StoreCart from "@/components/StoreCart";
import { Stars } from "@/components/Stars";
import Catalog from "./Catalog";
import StoreChatbot from "@/components/StoreChatbot";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  if (slug === "rua-dorico-varella-sao-joao-ponto-de-ref") {
    return { title: "TEXUGO CALÇADOS — catálogo" };
  }
  const r = await loadStorefront(slug);
  return r ? { title: `${r.store.name} — catálogo`, description: r.store.description ?? undefined } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "rua-dorico-varella-sao-joao-ponto-de-ref") {
    redirect("/texugo-calcados");
  }
  const r = await loadStorefront(slug);
  if (!r) notFound();
  const { store, products } = r;
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="storehead">
          <div className="storehead-top">
            <div className="logoBox big">{store.logo_url ? <img src={store.logo_url} alt={`Logo ${store.name}`} /> : <span>{store.name[0]}</span>}</div>
            <div className="storehead-title-block">
              <h1>{store.name}</h1>
              <div className="storehead-meta">
                {r.storeRating ? <Stars value={r.storeRating.avg_rating} count={r.storeRating.total} /> : <small className="muted">Novo catálogo</small>}
                {(store.category || store.city) && (
                  <span className="storehead-loc">· {[store.category, store.city].filter(Boolean).join(" · ")}</span>
                )}
              </div>
            </div>
          </div>
          <div className="storehead-details">
            {store.description && <p className="store-desc">{store.description}</p>}
            <div className="chips">
              {store.payment_methods.map((m) => <span key={"p" + m} className="chip">💳 {m}</span>)}
              {store.delivery_methods.map((m) => <span key={"d" + m} className="chip">📦 {m}</span>)}
            </div>
          </div>
        </section>
        <StoreCart store={{ slug: store.slug, name: store.name, whatsapp: store.whatsapp }} products={products} viewer={r.viewer} shipping={r.shipping} sellers={r.sellers}>
          <Catalog slug={store.slug} products={products} ratings={r.productRatings} />
          <StoreChatbot slug={store.slug} storeName={store.name} logoUrl={store.logo_url} products={products} />
        </StoreCart>
        <section id="avaliacoes" className="reviews">
          <h2>Avaliações da loja</h2>
          {!r.storeReviews.length && <p className="muted">Ninguém avaliou ainda. Só clientes com pedido entregue podem avaliar.</p>}
          {r.storeReviews.map((v) => (
            <div key={v.id} className="card rv">
              <div className="between"><strong>{v.reviewer_name}</strong><Stars value={v.rating} /></div>
              {v.comment && <p>{v.comment}</p>}
              <small className="muted">{new Date(v.created_at).toLocaleDateString("pt-BR")}</small>
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
