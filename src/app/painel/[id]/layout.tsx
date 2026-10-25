import Link from "next/link";
import { notFound } from "next/navigation";
import StoreTabs from "@/components/StoreTabs";
import { supabaseServer } from "@/lib/supabase/server";

export default async function StoreLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data: store } = await supabase.from("stores").select("id,name,slug,logo_url").eq("id", id).maybeSingle();
  if (!store) notFound();
  const { count } = await supabase.from("orders").select("id", { count: "exact", head: true }).eq("store_id", id).eq("status", "novo");
  return (
    <>
      <div className="between storebar">
        <div className="who">
          {store.logo_url ? <img src={store.logo_url} alt="" /> : <span className="ph">{store.name[0]}</span>}
          <strong>{store.name}</strong>
        </div>
        <Link className="btn" href={`/${store.slug}`} target="_blank">Ver catálogo ↗</Link>
      </div>
      <StoreTabs id={id} pending={count ?? 0} />
      {children}
    </>
  );
}
