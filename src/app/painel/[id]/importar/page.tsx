import { supabaseServer } from "@/lib/supabase/server";
import Importer from "./Importer";

export default async function Importar({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ produto?: string }> }) {
  const { id } = await params;
  const { produto } = await searchParams;
  const supabase = await supabaseServer();
  const { data: products } = await supabase.from("products").select("id,name,product_images(drive_file_id)").eq("store_id", id).order("name");
  const used = (products ?? []).flatMap((p) => p.product_images.map((i: { drive_file_id: string }) => i.drive_file_id));
  return (
    <>
      <h2>Importar do Google Drive</h2>
      <p className="muted">Escolha as fotos direto do seu Drive (você pode abrir pastas dentro da janela do Google). Só as fotos que você escolher ficam acessíveis ao app. O nome do produto vem do nome do arquivo e você edita depois.</p>
      <div className="card note"><b>Mesmo produto em várias cores ou tamanhos?</b> Escolha todas as fotos e use <i>Juntar em um produto</i> (ex.: “Camisa Lacoste”). Depois, em <i>Produtos</i>, monte a grade de tamanhos × cores e associe cada foto à sua variação. Se já criou um produto por foto, marque-os na lista de Produtos e clique em <i>Juntar em um produto</i>.</div>
      <Importer storeId={id} products={(products ?? []).map((p) => ({ id: p.id, name: p.name }))} used={used} initialProduct={produto} />
    </>
  );
}
