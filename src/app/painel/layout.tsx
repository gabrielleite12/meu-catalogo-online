import SiteHeader from "@/components/SiteHeader";
import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

export default async function PainelLayout({ children }: { children: React.ReactNode }) {
  const { data } = await (await supabaseServer()).auth.getUser();
  if (!data.user) redirect("/login?next=/painel");
  return (
    <>
      <SiteHeader />
      <main className="wrap">{children}</main>
    </>
  );
}
