import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { imgUrl, type Product } from "@/lib/utils";
import { updateProduct, deleteProduct, removeImage } from "../../actions";

export default async function Produtos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("products").select("*, product_images(id,drive_file_id,position)")
    .eq("store_id", id).order("position").order("created_at");
  const products = (data ?? []) as Product[];
  const { data: stats } = await supabase.from("product_rating_stats").select("*").in("product_id", products.map((p) => p.id));
  const rating = new Map((stats ?? []).map((s) => [s.product_id, s]));

  return (
    <>
      <div className="between">
        <h2>Produtos <span className="muted">({products.length})</span></h2>
        <Link className="btn primary" href={`/painel/${id}/importar`}>+ Importar fotos</Link>
      </div>
      {!products.length && <p className="muted">Nenhum produto ainda. Importe fotos do seu Drive para começar.</p>}
      <div className="stack">
        {products.map((p) => (
          <div className="card prod" key={p.id}>
            <div className="thumbs">
              {[...p.product_images].sort((a, b) => a.position - b.position).map((im) => (
                <form action={removeImage} key={im.id} className="thumb">
                  <input type="hidden" name="id" value={im.id} />
                  <img src={imgUrl(im.drive_file_id) + "?s=240"} alt="" loading="lazy" />
                  <button title="Remover foto" aria-label="Remover foto">×</button>
                </form>
              ))}
              <Link className="thumb add" href={`/painel/${id}/importar?produto=${p.id}`} title="Adicionar fotos">+</Link>
            </div>
            {rating.get(p.id) && <p className="muted">★ {rating.get(p.id).avg_rating} ({rating.get(p.id).total} avaliações)</p>}
            <form action={updateProduct} className="form">
              <input type="hidden" name="id" value={p.id} />
              <label>Nome<input name="name" defaultValue={p.name} /></label>
              <div className="row2">
                <label>Preço (opcional)<input name="price" defaultValue={p.price ?? ""} inputMode="decimal" placeholder="0,00" /></label>
                <label>Controlar estoque
                  <div className="inline">
                    <input type="checkbox" name="track_stock" defaultChecked={p.track_stock} title="Controlar estoque" />
                    <input name="stock" type="number" min={0} defaultValue={p.stock ?? 0} />
                  </div>
                </label>
              </div>
              <label>Descrição<textarea name="description" rows={2} defaultValue={p.description ?? ""} /></label>
              <div className="between">
                <label className="check"><input type="checkbox" name="active" defaultChecked={p.active} /> Visível</label>
                <div className="actions">
                  <button className="btn primary">Salvar</button>
                  <button className="btn danger" formAction={deleteProduct} formNoValidate>Excluir</button>
                </div>
              </div>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
