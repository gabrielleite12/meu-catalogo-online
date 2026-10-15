"use client";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function Login() {
  const entrar = () =>
    supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/drive.readonly",
        queryParams: { access_type: "offline", prompt: "consent" },
      },
    });
  return (
    <main className="center">
      <div className="card narrow">
        <h1>Entrar</h1>
        <p className="muted">Conecte sua conta Google para montar seu catálogo com as fotos do seu Drive. Só pedimos leitura — nunca alteramos seus arquivos.</p>
        <button className="btn primary block" onClick={entrar}>Continuar com Google</button>
      </div>
    </main>
  );
}
