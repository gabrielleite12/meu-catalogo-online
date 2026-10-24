import { notFound } from "next/navigation";
import type { Metadata } from "next";
import SiteHeader from "@/components/SiteHeader";
import StoreCart from "@/components/StoreCart";
import { loadStorefront } from "@/lib/storefront";
import { priceLabel } from "@/lib/catalog";
import ProductView from "./ProductView";

type Params = { params: Promise<{ slug: string; id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, id } = await params;
  const r = await loadStorefront(slug);
  const p = r?.products.find((x) => x.id === id);
  return p ? { title: `${p.name} — ${r!.store.name}`, description: `${p.name} · ${priceLabel(p)}${p.description ? " · " + p.description : ""}`.slice(0, 160) } : {};
}

export default async function ProdutoPage({ params }: Params) {
  const { slug, id } = await params;
  const r = await loadStorefront(slug);
  if (!r) notFound();
  const product = r.products.find((x) => x.id === id);
  if (!product) notFound();
  const { store } = r;
  const related = r.products.filter((x) => x.id !== id && (!product.category || x.category === product.category)).slice(0, 8);
  return (
    <>
      <SiteHeader />
      <StoreCart store={{ slug: store.slug, name: store.name, whatsapp: store.whatsapp }} products={r.products} viewer={r.viewer} floatingBar={false}>
        <ProductView
          store={{ slug: store.slug, name: store.name, logo_url: store.logo_url, payment_methods: store.payment_methods, delivery_methods: store.delivery_methods }}
          product={product} rating={r.productRatings[id] ?? null} reviews={r.productReviews[id] ?? []} related={related}
        />
      </StoreCart>
    </>
  );
}
