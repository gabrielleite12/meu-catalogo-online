import { supabaseServer } from "@/lib/supabase/server";
import StoreForm from "../[id]/StoreForm";

export default async function Novo() {
  const { data } = await (await supabaseServer()).auth.getUser();
  return (
    <>
      <h1>Novo catálogo</h1>
      <StoreForm store={null} userId={data.user!.id} />
    </>
  );
}
