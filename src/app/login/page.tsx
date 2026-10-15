import { safeNext } from "@/lib/utils";
import LoginButton from "./LoginButton";

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safeNext((await searchParams).next, "/painel");
  return (
    <main className="center">
      <div className="card narrow">
        <h1>Entrar</h1>
        <p className="muted">Entre com sua conta Google para pedir, avaliar lojas ou criar seu catálogo. Seus dados só são usados para os pedidos.</p>
        <LoginButton next={next} />
      </div>
    </main>
  );
}
