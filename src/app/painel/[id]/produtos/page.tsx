import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Product, Template } from "@/lib/utils";
import ProductList from "./ProductList";
import { saveTemplate, deleteTemplate } from "../../actions";
import SubmitButton from "@/components/SubmitButton";

export default async function Produtos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("products").select("*, product_images(id,drive_file_id,position), product_variants(*)")
    .eq("store_id", id).order("position").order("created_at");
  const products = (data ?? []) as Product[];
  const { data: stats } = products.length ? await supabase.from("product_rating_stats").select("*").in("product_id", products.map((p) => p.id)) : { data: [] };
  const ratings = Object.fromEntries((stats ?? []).map((s) => [s.product_id, { avg_rating: Number(s.avg_rating), total: s.total }]));
  const { data: tpl } = await supabase.from("variation_templates").select("*").or(`store_id.is.null,store_id.eq.${id}`).order("name");
  const templates = (tpl ?? []) as Template[];
  const mine = templates.filter((t) => t.store_id);

  return (
    <>
      <div className="between">
        <h2>Produtos <span className="muted">({products.length})</span></h2>
        <Link className="btn primary" href={`/painel/${id}/importar`}>+ Importar fotos</Link>
      </div>
      {!products.length
        ? <p className="muted">Nenhum produto ainda. Importe fotos do seu Drive para começar.</p>
        : <ProductList products={products} storeId={id} ratings={ratings} templates={templates} />}

      <details className="card tplbox">
        <summary><b>Modelos de variação</b> <span className="muted">— atalhos para tamanho, cor, numeração…</span></summary>
        <p className="muted">Os modelos padrão (Tamanho, Numeração de calçados, Cor, Gênero) já aparecem no editor de produto. Crie os seus aqui; os marcados com ★ são exclusivos desta loja.</p>
        {mine.map((t) => (
          <form action={deleteTemplate} key={t.id} className="tplrow">
            <input type="hidden" name="id" value={t.id} />
            <span><b>{t.name}</b> <span className="muted">{t.options.join(", ")}</span></span>
            <SubmitButton className="btn sm danger" pendingText="…">Excluir</SubmitButton>
          </form>
        ))}
        <form action={saveTemplate} className="tplnew">
          <input type="hidden" name="store_id" value={id} />
          <input name="name" placeholder="Nome (ex.: Tamanho infantil)" required />
          <input name="options" placeholder="Opções separadas por vírgula (2, 4, 6, 8)" required />
          <SubmitButton className="btn sm primary" pendingText="Salvando…">Criar modelo</SubmitButton>
        </form>
      </details>
    </>
  );
}
