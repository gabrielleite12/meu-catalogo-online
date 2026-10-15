import { supabaseServer } from "@/lib/supabase/server";
import StoreForm from "./StoreForm";
import { deleteStore } from "../actions";
import type { Store } from "@/lib/utils";

export default async function Config({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: store } = await supabase.from("stores").select("*").eq("id", id).single();
  return (
    <>
      <StoreForm store={store as Store} userId={u.user!.id} />
      <form action={deleteStore} className="danger-zone">
        <input type="hidden" name="id" value={id} />
        <button className="btn danger">Excluir este catálogo</button>
        <small className="muted">Apaga produtos, pedidos e avaliações. Não pode ser desfeito.</small>
      </form>
    </>
  );
}
