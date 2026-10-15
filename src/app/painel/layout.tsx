import Link from "next/link";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) redirect("/login?next=/painel");
  return (
    <>
      <header className="top">
        <Link href="/" className="logo">Expositor</Link>
        <nav>
          <Link href="/painel">Meus catálogos</Link>
          <Link href="/conta">Minha conta e pedidos</Link>
        </nav>
        <form action={signOut}><button className="btn ghost">Sair</button></form>
      </header>
      <main className="wrap">{children}</main>
    </>
  );
}
