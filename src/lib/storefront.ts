import { supabaseServer } from "@/lib/supabase/server";
import type { Product, Store, Rating, Review } from "@/lib/utils";

/** Carrega a loja pública com produtos, variações, avaliações e dados do visitante. */
export async function loadStorefront(slug: string) {
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
