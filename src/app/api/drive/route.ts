import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { driveAccessToken, listFolder } from "@/lib/google";

export async function GET(req: Request) {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = await driveAccessToken(data.user.id);
  if (!token) return NextResponse.json({ error: "reconnect" }, { status: 424 });
  const folder = new URL(req.url).searchParams.get("folder") || "root";
  try {
    return NextResponse.json({ items: await listFolder(token, folder) });
  } catch {
    return NextResponse.json({ error: "drive" }, { status: 502 });
  }
}
