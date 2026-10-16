import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeNext } from "@/lib/utils";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  if (searchParams.get("error")) console.error("[auth] erro do provedor:", searchParams.get("error"), searchParams.get("error_code"), searchParams.get("error_description"));
  const next = safeNext(searchParams.get("next"), "/painel");
  if (!code) return NextResponse.redirect(`${origin}/login?erro=1`);

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) console.error("[auth] exchangeCodeForSession:", error.message);
  if (error || !data.session) return NextResponse.redirect(`${origin}/login?erro=1`);

  // O refresh token só vem neste momento: guardamos para ler o Drive depois.
  const refresh = data.session.provider_refresh_token;
  console.log("[auth] login ok; refresh token do Google:", refresh ? "recebido" : "AUSENTE");
  if (refresh) {
    await supabaseAdmin()
      .from("drive_tokens")
      .upsert({ user_id: data.session.user.id, refresh_token: refresh, updated_at: new Date().toISOString() });
  }
  return NextResponse.redirect(`${origin}${next}`);
}
