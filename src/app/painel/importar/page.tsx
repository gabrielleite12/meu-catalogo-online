import { supabaseServer } from "@/lib/supabase/server";
import Importer from "./Importer";

export default async function Importar({ searchParams }: { searchParams: Promise<{ produto?: string }> }) {
  const { produto } = await searchParams;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: store } = await supabase.from("stores").select("id").eq("owner_id", u.user!.id).maybeSingle();
  if (!store) return <p>Crie sua loja primeiro na aba Loja.</p>;
  const { data: products } = await supabase.from("products").select("id,name,product_images(drive_file_id)").eq("store_id", store.id).order("name");
  const used = (products ?? []).flatMap((p) => p.product_images.map((i: { drive_file_id: string }) => i.drive_file_id));
  return (
    <>
      <h1>Importar do Google Drive</h1>
      <p className="muted">Navegue pelas pastas, marque as fotos e escolha como criar os produtos. O nome inicial vem do nome do arquivo — você edita depois.</p>
      <Importer products={(products ?? []).map((p) => ({ id: p.id, name: p.name }))} used={used} initialProduct={produto} />
    </>
  );
}
