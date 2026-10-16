import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Product } from "@/lib/utils";
import ProductList from "./ProductList";

export default async function Produtos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("products").select("*, product_images(id,drive_file_id,position), product_variants(*)")
    .eq("store_id", id).order("position").order("created_at");
  const products = (data ?? []) as Product[];
  const { data: stats } = products.length ? await supabase.from("product_rating_stats").select("*").in("product_id", products.map((p) => p.id)) : { data: [] };
  const ratings = Object.fromEntries((stats ?? []).map((s) => [s.product_id, { avg_rating: Number(s.avg_rating), total: s.total }]));

  return (
    <>
      <div className="between">
        <h2>Produtos <span className="muted">({products.length})</span></h2>
        <Link className="btn primary" href={`/painel/${id}/importar`}>+ Importar fotos</Link>
      </div>
      {!products.length
        ? <p className="muted">Nenhum produto ainda. Importe fotos do seu Drive para começar.</p>
        : <ProductList products={products} storeId={id} ratings={ratings} />}
    </>
  );
}
