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
      <Importer storeId={id} products={(products ?? []).map((p) => ({ id: p.id, name: p.name }))} used={used} initialProduct={produto} />
    </>
  );
}
