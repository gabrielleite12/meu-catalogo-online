import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/login");
  const { data: store } = await supabase.from("stores").select("slug").eq("owner_id", data.user.id).maybeSingle();
  return (
    <>
      <header className="top">
        <Link href="/" className="logo">Expositor</Link>
        <nav>
          <Link href="/painel">Loja</Link>
          <Link href="/painel/produtos">Produtos</Link>
          <Link href="/painel/importar">Importar do Drive</Link>
          {store && <Link href={`/${store.slug}`} target="_blank">Ver catálogo ↗</Link>}
        </nav>
        <form action={signOut}><button className="btn ghost">Sair</button></form>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
