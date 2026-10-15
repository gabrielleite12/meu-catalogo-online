import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { safeNext } from "@/lib/utils";

export async function GET(req: Request) {
  const { searchParams, origin } = new URL(req.url);
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"), "/painel");
  if (!code) return NextResponse.redirect(`${origin}/login`);

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.session) return NextResponse.redirect(`${origin}/login`);

  // O refresh token só vem neste momento: guardamos para ler o Drive depois.
  const refresh = data.session.provider_refresh_token;
  if (refresh) {
    await supabaseAdmin()
      .from("drive_tokens")
      .upsert({ user_id: data.session.user.id, refresh_token: refresh, updated_at: new Date().toISOString() });
  }
  return NextResponse.redirect(`${origin}${next}`);
}
