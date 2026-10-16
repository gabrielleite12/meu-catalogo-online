import { NextResponse } from "next/server";
import { supabaseServer } from "@/lib/supabase/server";
import { driveAccessToken } from "@/lib/google";

// Lista as imagens de uma pasta que o usuário liberou pelo Picker (escopo drive.file).
export async function GET(req: Request) {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const token = await driveAccessToken(data.user.id);
  if (!token) return NextResponse.json({ error: "reconnect" }, { status: 424 });
  const id = new URL(req.url).searchParams.get("id") ?? "";
  if (!/^[\w-]{10,80}$/.test(id)) return NextResponse.json({ error: "bad id" }, { status: 400 });

  const files: { id: string; name: string }[] = [];
  let pageToken = "";
  do {
    const u = new URL("https://www.googleapis.com/drive/v3/files");
    u.searchParams.set("q", `'${id}' in parents and trashed=false and mimeType contains 'image/'`);
    u.searchParams.set("fields", "nextPageToken,files(id,name)");
    u.searchParams.set("orderBy", "name");
    u.searchParams.set("pageSize", "200");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return NextResponse.json({ error: "drive", status: r.status }, { status: 502 });
    const j = (await r.json()) as { files: { id: string; name: string }[]; nextPageToken?: string };
    files.push(...j.files);
    pageToken = j.nextPageToken ?? "";
  } while (pageToken && files.length < 500);
  return NextResponse.json({ files });
}
