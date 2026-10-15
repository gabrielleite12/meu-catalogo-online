import { supabaseServer } from "@/lib/supabase/server";
import StoreForm from "./StoreForm";
import type { Store } from "@/lib/utils";

export default async function Painel() {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data: store } = await supabase.from("stores").select("*").eq("owner_id", u.user!.id).maybeSingle();
  return (
    <>
      <h1>{store ? "Sua loja" : "Vamos criar sua loja"}</h1>
      {!store && <p className="muted">Depois de salvar, importe suas fotos do Google Drive e transforme cada uma em produto.</p>}
      <StoreForm store={store as Store | null} />
    </>
  );
}
