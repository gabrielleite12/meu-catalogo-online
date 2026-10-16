import SiteHeader from "@/components/SiteHeader";
import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { imgUrl, type Store } from "@/lib/utils";
import { Stars } from "@/components/Stars";

export default async function Home({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const supabase = await supabaseServer();
  const { data: user } = await supabase.auth.getUser();
  const { data } = await supabase.rpc("search_stores", { q: q.trim().replace(/[%,]/g, " ") });
  const stores = (data ?? []) as Store[];

  const { data: stats } = stores.length ? await supabase.from("store_rating_stats").select("*").in("store_id", stores.map((s) => s.id)) : { data: [] };
  const rating = new Map((stats ?? []).map((r) => [r.store_id, r]));
  const covers = new Map<string, string>();
  if (stores.length) {
    const { data: prods } = await supabase
      .from("products").select("store_id, product_images(drive_file_id,position)")
      .in("store_id", stores.map((s) => s.id)).eq("active", true).order("position").limit(400);
    for (const p of prods ?? []) {
      const first = [...(p.product_images as { drive_file_id: string; position: number }[])].sort((a, b) => a.position - b.position)[0];
      if (first && !covers.has(p.store_id)) covers.set(p.store_id, first.drive_file_id);
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="wrap">
        <section className="hero">
          <h1>Encontre lojas e produtos</h1>
          <form className="search" action="/">
            <input name="q" defaultValue={q} placeholder="Busque por loja, tipo de produto ou cidade…" autoFocus={!!q} />
            <button className="btn primary">Buscar</button>
          </form>
        </section>
        {!stores.length && <p className="muted center-text">{q ? "Nenhuma loja encontrada." : "Ainda não há catálogos publicados."}</p>}
        <div className="grid stores">
          {stores.map((s) => (
            <Link key={s.id} href={`/${s.slug}`} className="card store">
              <div className="cover">{s.logo_url ? <img src={s.logo_url} alt="" className="contain" /> : covers.has(s.id) ? <img src={imgUrl(covers.get(s.id)!) + "?s=500"} alt="" loading="lazy" /> : <span>{s.name[0]}</span>}</div>
              <div className="body">
                <strong>{s.name}</strong>
                {rating.get(s.id) && <Stars value={Number(rating.get(s.id).avg_rating)} count={rating.get(s.id).total} />}
                <span className="muted">{[s.category, s.city].filter(Boolean).join(" · ")}</span>
              </div>
            </Link>
          ))}
        </div>
      </main>
    </>
  );
}
