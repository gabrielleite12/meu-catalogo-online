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

/** "foto_vestido-azul.JPG" -> "foto vestido azul" */
export const nameFromFile = (f: string) =>
  f.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
