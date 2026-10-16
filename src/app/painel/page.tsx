import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import type { Store } from "@/lib/utils";

export default async function Painel() {
  const supabase = await supabaseServer();
  const { data: u } = await supabase.auth.getUser();
  const first = String(u.user!.user_metadata?.full_name ?? u.user!.email).split(/[ @]/)[0];
  const { data } = await supabase.from("stores").select("*").eq("owner_id", u.user!.id).order("created_at");
  const stores = (data ?? []) as Store[];
  const ids = stores.map((s) => s.id);

  const { data: prods } = ids.length ? await supabase.from("products").select("store_id").in("store_id", ids) : { data: [] };
  const { data: open } = ids.length ? await supabase.from("orders").select("store_id").eq("status", "novo").in("store_id", ids) : { data: [] };
  const count = (rows: { store_id: string }[] | null, id: string) => (rows ?? []).filter((r) => r.store_id === id).length;
  const totalOpen = (open ?? []).length;

  return (
    <>
      <div className="between">
        <div>
          <h1>Olá, {first}!</h1>
          <p className="muted" style={{ margin: 0 }}>Gerencie seus catálogos, produtos e pedidos.</p>
        </div>
        <Link className="btn primary" href="/painel/novo">+ Novo catálogo</Link>
      </div>

      <div className="stats">
        <div className="card stat"><b>{stores.length}</b><span>catálogos</span></div>
        <div className="card stat"><b>{prods?.length ?? 0}</b><span>produtos</span></div>
        <Link href={stores[0] ? `/painel/${stores[0].id}/pedidos` : "/painel"} className="card stat"><b>{totalOpen}</b><span>pedidos novos</span></Link>
      </div>

      {!stores.length && (
        <div className="card note">
          <h3>Comece em 3 passos</h3>
          <ol><li>Crie seu catálogo (nome, logo, WhatsApp).</li><li>Conecte o Google Drive e escolha as fotos.</li><li>Divulgue o link e receba pedidos.</li></ol>
          <Link className="btn primary" href="/painel/novo">Criar meu primeiro catálogo</Link>
        </div>
      )}

      <div className="grid stores">
        {stores.map((s) => {
          const n = count(prods, s.id), o = count(open, s.id);
          const todo = [!s.logo_url && "adicionar logo", !s.whatsapp && "informar WhatsApp", n === 0 && "importar fotos"].filter(Boolean);
          return (
            <div key={s.id} className="card store">
              <Link href={`/painel/${s.id}`} className="cover">{s.logo_url ? <img src={s.logo_url} alt="" className="contain" /> : <span>{s.name[0]}</span>}</Link>
              <div className="body">
                <strong>{s.name}</strong>
                <span className="muted">/{s.slug} · {n} produto(s){!s.published && " · oculto"}</span>
                {o > 0 && <span className="chip">🔔 {o} pedido(s) novo(s)</span>}
                {todo.length > 0 && <small className="muted">Falta: {todo.join(", ")}</small>}
                <div className="actions">
                  <Link className="btn sm" href={`/painel/${s.id}/produtos`}>Produtos</Link>
                  <Link className="btn sm" href={`/painel/${s.id}/importar`}>Importar</Link>
                  <Link className="btn sm" href={`/painel/${s.id}/pedidos`}>Pedidos</Link>
                  <Link className="btn sm" href={`/${s.slug}`} target="_blank">Ver ↗</Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
