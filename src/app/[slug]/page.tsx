import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { supabaseServer } from "@/lib/supabase/server";
import type { Product, Store } from "@/lib/utils";
import Catalog from "./Catalog";

async function load(slug: string) {
  const supabase = await supabaseServer();
  const { data: store } = await supabase.from("stores").select("*").eq("slug", slug).maybeSingle();
  if (!store) return null;
  const { data: products } = await supabase
    .from("products").select("*, product_images(id,drive_file_id,position)")
    .eq("store_id", store.id).eq("active", true).order("position").order("created_at");
  return { store: store as Store, products: (products ?? []) as Product[] };
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
      <header className="top"><Link href="/" className="logo">Expositor</Link><nav /></header>
      <main className="wrap">
        <section className="storehead">
          <h1>{store.name}</h1>
          <p className="muted">{[store.category, store.city].filter(Boolean).join(" · ")}</p>
          {store.description && <p>{store.description}</p>}
          <div className="chips">
            {store.payment_methods.map((m) => <span key={"p" + m} className="chip">💳 {m}</span>)}
            {store.delivery_methods.map((m) => <span key={"d" + m} className="chip">📦 {m}</span>)}
          </div>
        </section>
        <Catalog store={{ slug: store.slug, name: store.name, whatsapp: store.whatsapp }} products={products} />
      </main>
    </>
  );
}
