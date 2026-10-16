import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import type { Product, Store, Rating, Review } from "@/lib/utils";
import { Stars } from "@/components/Stars";
import Catalog from "./Catalog";

async function load(slug: string) {
  const supabase = await supabaseServer();
  const { data: store } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
  if (!store) return null;
  const { data: products } = await supabase
    .from("products").select("*, product_images(id,drive_file_id,position), product_variants(*)")
    .eq("store_id", store.id).eq("active", true).order("position").order("created_at");
  const ids = (products ?? []).map((p) => p.id);
  const [{ data: sStat }, { data: pStats }, { data: sRev }, { data: pRev }] = await Promise.all([
    supabase.from("store_rating_stats").select("*").eq("store_id", store.id).maybeSingle(),
    ids.length ? supabase.from("product_rating_stats").select("*").in("product_id", ids) : { data: [] },
    supabase.from("store_reviews").select("id,reviewer_name,rating,comment,created_at").eq("store_id", store.id).order("created_at", { ascending: false }).limit(30),
    ids.length ? supabase.from("product_reviews").select("id,product_id,reviewer_name,rating,comment,created_at").in("product_id", ids).order("created_at", { ascending: false }).limit(200) : { data: [] },
  ]);
  const { data: u } = await supabase.auth.getUser();
  const { data: profile } = u.user ? await supabase.from("profiles").select("id").eq("id", u.user.id).maybeSingle() : { data: null };
  const productRatings: Record<string, Rating> = {};
  (pStats ?? []).forEach((r) => (productRatings[r.product_id] = { avg_rating: Number(r.avg_rating), total: r.total }));
  const productReviews: Record<string, Review[]> = {};
  (pRev ?? []).forEach((r) => (productReviews[r.product_id] ??= []).push(r as Review));
  return {
    store: store as Store, products: (products ?? []) as Product[],
    storeRating: sStat ? ({ avg_rating: Number(sStat.avg_rating), total: sStat.total } as Rating) : null,
    storeReviews: (sRev ?? []) as Review[], productRatings, productReviews,
    viewer: { loggedIn: !!u.user, hasProfile: !!profile },
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const r = await load((await params).slug);
  return r ? { title: `${r.store.name} — catálogo`, description: r.store.description ?? undefined } : {};
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const r = await load((await params).slug);
  if (!r) notFound();
  const { store, products } = r;
  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="storehead">
          <div className="logoBox big">{store.logo_url ? <img src={store.logo_url} alt={`Logo ${store.name}`} /> : <span>{store.name[0]}</span>}</div>
          <div>
            <h1>{store.name}</h1>
            {r.storeRating ? <Stars value={r.storeRating.avg_rating} count={r.storeRating.total} /> : <small className="muted">Ainda sem avaliações</small>}
            <p className="muted">{[store.category, store.city].filter(Boolean).join(" · ")}</p>
            {store.description && <p>{store.description}</p>}
            <div className="chips">
              {store.payment_methods.map((m) => <span key={"p" + m} className="chip">💳 {m}</span>)}
              {store.delivery_methods.map((m) => <span key={"d" + m} className="chip">📦 {m}</span>)}
            </div>
          </div>
        </section>
        <Catalog
          store={{ slug: store.slug, name: store.name, whatsapp: store.whatsapp }} products={products}
          ratings={r.productRatings} reviews={r.productReviews} viewer={r.viewer}
        />
        <section id="avaliacoes" className="reviews">
          <h2>Avaliações da loja</h2>
          {!r.storeReviews.length && <p className="muted">Ninguém avaliou ainda. Só clientes com pedido finalizado podem avaliar.</p>}
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
