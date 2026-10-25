"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

type Sub = { endpoint: string; keys: { p256dh: string; auth: string } };

/** Guarda o aparelho para receber avisos. Se o mesmo aparelho trocar de conta, a inscrição passa para a conta atual. */
export async function savePushSubscription(sub: Sub): Promise<{ ok: boolean }> {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user || !sub?.endpoint?.startsWith("https://") || !sub.keys?.p256dh || !sub.keys?.auth) return { ok: false };
  const { error } = await supabaseAdmin().from("push_subscriptions")
    .upsert({ user_id: data.user.id, endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth }, { onConflict: "endpoint" });
  return { ok: !error };
}

export async function removePushSubscription(endpoint: string): Promise<{ ok: boolean }> {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) return { ok: false };
  const { error } = await supabaseAdmin().from("push_subscriptions").delete().eq("endpoint", endpoint).eq("user_id", data.user.id);
  return { ok: !error };
}
