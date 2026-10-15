import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { driveAccessToken } from "@/lib/google";

// Entrega ao próprio usuário um access token curto do Drive, usado pelo Google Picker.
export async function GET() {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = await driveAccessToken(data.user.id);
  if (!token) return NextResponse.json({ error: "reconnect" }, { status: 424 });
  return NextResponse.json({ token }, { headers: { "Cache-Control": "no-store" } });
}
