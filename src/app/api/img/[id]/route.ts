import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { driveAccessToken } from "@/lib/google";

// Entrega a miniatura de uma foto do Drive usando o token do dono da loja.
// Só serve arquivos vinculados a uma loja publicada, ou do próprio usuário logado (pré-visualização).
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[\w-]{10,80}$/.test(id)) return new Response("bad id", { status: 400 });
  const size = Math.min(Number(new URL(req.url).searchParams.get("s")) || 800, 1600);

  let ownerId: string | null = null;
  const { data: link } = await supabaseAdmin()
    .from("product_images")
    .select("products!inner(stores!inner(owner_id,published))")
    .eq("drive_file_id", id)
    .limit(1)
    .maybeSingle();
  // @ts-expect-error relação aninhada
  const store = link?.products?.stores;
  if (store?.published) ownerId = store.owner_id;

  if (!ownerId) {
    const { data } = await (await supabaseServer()).auth.getUser();
    ownerId = data.user?.id ?? null;
  }
  if (!ownerId) return new Response("not found", { status: 404 });

  const token = await driveAccessToken(ownerId);
  if (!token) return new Response("drive not connected", { status: 424 });

  const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${id}?fields=thumbnailLink`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!meta.ok) return new Response("not found", { status: 404 });
  const { thumbnailLink } = (await meta.json()) as { thumbnailLink?: string };
  if (!thumbnailLink) return new Response("no thumbnail", { status: 404 });

  const img = await fetch(thumbnailLink.replace(/=s\d+$/, `=s${size}`));
  if (!img.ok) return new Response("upstream", { status: 502 });
  return new Response(img.body, {
    headers: {
      "Content-Type": img.headers.get("content-type") ?? "image/jpeg",
      "Cache-Control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400",
    },
  });
}
