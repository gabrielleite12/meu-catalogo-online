import { supabaseAdmin } from "./supabase/admin";

const cache = new Map<string, { token: string; exp: number }>();

/** Troca o refresh token guardado por um access token do Google Drive (somente leitura). */
export async function driveAccessToken(userId: string): Promise<string | null> {
  const hit = cache.get(userId);
  if (hit && hit.exp > Date.now() + 30_000) return hit.token;

  const { data } = await supabaseAdmin().from("drive_tokens").select("refresh_token").eq("user_id", userId).maybeSingle();
  if (!data) return null;

  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: data.refresh_token,
      grant_type: "refresh_token",
    }),
  });
  if (!r.ok) return null;
  const j = (await r.json()) as { access_token: string; expires_in: number };
  cache.set(userId, { token: j.access_token, exp: Date.now() + j.expires_in * 1000 });
  return j.access_token;
}

export type DriveItem = { id: string; name: string; mimeType: string };

export async function listFolder(token: string, folderId: string): Promise<DriveItem[]> {
  const q = `'${folderId.replace(/'/g, "")}' in parents and trashed=false and (mimeType='application/vnd.google-apps.folder' or mimeType contains 'image/')`;
  const items: DriveItem[] = [];
  let pageToken = "";
  do {
    const u = new URL("https://www.googleapis.com/drive/v3/files");
    u.searchParams.set("q", q);
    u.searchParams.set("fields", "nextPageToken,files(id,name,mimeType)");
    u.searchParams.set("orderBy", "folder,name");
    u.searchParams.set("pageSize", "200");
    if (pageToken) u.searchParams.set("pageToken", pageToken);
    const r = await fetch(u, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) throw new Error(`Drive ${r.status}`);
    const j = (await r.json()) as { files: DriveItem[]; nextPageToken?: string };
    items.push(...j.files);
    pageToken = j.nextPageToken ?? "";
  } while (pageToken && items.length < 1000);
  return items;
}

/** "foto_vestido-azul.JPG" -> "foto vestido azul" */
export const nameFromFile = (f: string) =>
  f.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
