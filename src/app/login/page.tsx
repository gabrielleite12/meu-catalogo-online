import Link from "next/link";
import { safeNext } from "@/lib/utils";
import LoginButton from "./LoginButton";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; erro?: string }> }) {
  const sp = await searchParams;
  const next = safeNext(sp.next, "/painel");
  return (
    <main className="center">
      <div className="card narrow">
        <h1>Entrar</h1>
        <p className="muted">Entre com sua conta Google para pedir, avaliar lojas ou criar seu catálogo. Seus dados só são usados para os pedidos.</p>
        {sp.erro && <p className="err">Não foi possível entrar. Se o Google mostrou “erro 403 / access_denied”, o app ainda está em modo de teste — veja a <Link href="/ajuda">ajuda</Link>.</p>}
        <LoginButton next={next} />
        <p className="muted" style={{ marginTop: 16 }}><Link href="/ajuda">Primeira vez? Veja como funciona</Link></p>
      </div>
    </main>
  );
}
