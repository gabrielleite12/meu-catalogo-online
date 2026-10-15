"use client";
import { supabaseBrowser } from "@/lib/supabase/client";

export default function LoginButton({ next, drive }: { next: string; drive?: boolean }) {
  const entrar = () =>
    supabaseBrowser().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
        // Drive só é pedido quando o lojista conecta o Drive. drive.file = apenas as fotos que ele escolher.
        ...(drive && {
          scopes: "https://www.googleapis.com/auth/drive.file",
          queryParams: { access_type: "offline", prompt: "consent" },
        }),
      },
    });
  return <button className="btn primary block" onClick={entrar}>{drive ? "Conectar Google Drive" : "Continuar com Google"}</button>;
}
