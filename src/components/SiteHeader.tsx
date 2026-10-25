import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { signOut } from "@/app/painel/actions";
import NotifyButton from "@/components/NotifyButton";

export default async function SiteHeader() {
  const supabase = await supabaseServer();
  const { data } = await supabase.auth.getUser();
  const user = data.user;

  let pending = 0;
  if (user) {
    const { data: mine } = await supabase.from("stores").select("id").eq("owner_id", user.id);
    if (mine?.length) {
      const { count } = await supabase.from("orders").select("id", { count: "exact", head: true })
        .eq("status", "novo").in("store_id", mine.map((s) => s.id));
      pending = count ?? 0;
    }
  }
  const meta = (user?.user_metadata ?? {}) as { full_name?: string; name?: string; avatar_url?: string; picture?: string };
  const name = meta.full_name ?? meta.name ?? user?.email?.split("@")[0] ?? "";
  const avatar = meta.avatar_url ?? meta.picture;

  return (
    <header className="top">
      <Link href="/" className="logo" aria-label="Vitrine Zap — página inicial">
        <img src="/icons/icon-192.png" alt="" width={34} height={34} />
        <span className="lw">Vitrine<b>Zap</b></span>
      </Link>
      <nav>
        <Link href="/">Buscar lojas</Link>
        <Link href="/ajuda">Como funciona</Link>
      </nav>
      {user ? (
        <details className="menu">
          <summary>
            {avatar ? <img src={avatar} alt="" referrerPolicy="no-referrer" /> : <span className="av">{name[0]?.toUpperCase()}</span>}
            <span className="nm">{name.split(" ")[0]}</span>
            {pending > 0 && <span className="dot">{pending}</span>}
          </summary>
          <div className="drop">
            <div className="who2"><b>{name}</b><small className="muted">{user.email}</small></div>
            <Link href="/painel">🏬 Meus catálogos{pending > 0 && <span className="dot">{pending} novo(s)</span>}</Link>
            <Link href="/painel/novo">➕ Novo catálogo</Link>
            <Link href="/conta">👤 Minha conta e pedidos</Link>
            <NotifyButton />
            <Link href="/ajuda">❓ Ajuda</Link>
            <form action={signOut}><button>↩ Sair</button></form>
          </div>
        </details>
      ) : (
        <div className="actions">
          <Link className="btn" href="/login">Entrar</Link>
          <Link className="btn primary" href="/login?next=/painel">Criar meu catálogo</Link>
        </div>
      )}
    </header>
  );
}
