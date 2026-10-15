import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Store } from "@/lib/utils";

export default async function Painel() {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const { data } = await supabase.from("stores").select("*").eq("owner_id", u.user!.id).order("created_at");
  const stores = (data ?? []) as Store[];
  const { data: open } = await supabase.from("orders").select("store_id").eq("status", "novo").in("store_id", stores.map((s) => s.id));
  const pending = new Map<string, number>();
  (open ?? []).forEach((o) => pending.set(o.store_id, (pending.get(o.store_id) ?? 0) + 1));

  return (
    <>
      <div className="between">
        <h1>Meus catálogos</h1>
        <Link className="btn primary" href="/painel/novo">+ Novo catálogo</Link>
      </div>
      <p className="muted">Você pode ter vários catálogos na mesma conta — cada um com logo, endereço e produtos próprios.</p>
      {!stores.length && <p className="muted">Você ainda não tem catálogos. Crie o primeiro!</p>}
      <div className="grid stores">
        {stores.map((s) => (
          <Link key={s.id} href={`/painel/${s.id}`} className="card store">
            <div className="cover">{s.logo_url ? <img src={s.logo_url} alt="" className="contain" /> : <span>{s.name[0]}</span>}</div>
            <div className="body">
              <strong>{s.name}</strong>
              <span className="muted">/{s.slug}{!s.published && " · oculto"}</span>
              {!!pending.get(s.id) && <span className="chip">🔔 {pending.get(s.id)} pedido(s) novo(s)</span>}
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
