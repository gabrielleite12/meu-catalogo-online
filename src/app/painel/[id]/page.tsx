import { supabaseServer } from "@/lib/supabase/server";
import StoreForm from "./StoreForm";
import DeleteStore from "../DeleteStore";
import type { Store } from "@/lib/utils";

export default async function Config({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: store } = await supabase.from("stores").select("*").eq("id", id).single();
  return (
    <>
      <StoreForm store={store as Store} userId={u.user!.id} />
      <div className="card danger-zone">
        <div><b>Zona de perigo</b><br /><small className="muted">Excluir apaga produtos, pedidos e avaliações deste catálogo. Não pode ser desfeito.</small></div>
        <DeleteStore id={id} name={store!.name} />
      </div>
    </>
  );
}
