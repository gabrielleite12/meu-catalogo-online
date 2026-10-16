"use client";
import { useActionState, useEffect, useState } from "react";
import { saveStore } from "../actions";
import { supabaseBrowser } from "@/lib/supabase/client";
import type { Store } from "@/lib/utils";

const MAX = 1024 * 1024; // 1 MB
const TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export default function StoreForm({ store, userId }: { store: Store | null; userId: string }) {
  const [state, action, pending] = useActionState(saveStore, {});
  const [logo, setLogo] = useState(store?.logo_url ?? "");
  const [logoErr, setLogoErr] = useState("");
  const [up, setUp] = useState(false);
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(location.origin), []);

  async function onFile(f?: File) {
    if (!f) return;
    setLogoErr("");
    const ext = TYPES[f.type];
    if (!ext) return setLogoErr("Use uma imagem PNG, JPG ou WEBP.");
    if (f.size > MAX) return setLogoErr("A logo deve ter no máximo 1 MB.");
    setUp(true);
    const sb = supabaseBrowser();
    const path = `${userId}/${crypto.randomUUID()}.${ext}`;
    const { error } = await sb.storage.from("logos").upload(path, f, { contentType: f.type, cacheControl: "31536000" });
    setUp(false);
    if (error) return setLogoErr("Não foi possível enviar a logo.");
    setLogo(sb.storage.from("logos").getPublicUrl(path).data.publicUrl);
  }

  return (
    <form action={action} className="card form">
      <input type="hidden" name="id" value={store?.id ?? ""} />
      <input type="hidden" name="logo_url" value={logo} />
      <h3 className="sec">Identidade</h3>
      <div className="logoPick">
        <div className="logoBox">{logo ? <img src={logo} alt="Logo" /> : <span>{(store?.name ?? "?")[0]}</span>}</div>
        <div>
          <label className="btn sm">{up ? "Enviando…" : "Escolher logo"}
            <input type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </label>
          {logo && <button type="button" className="link" onClick={() => setLogo("")}> remover</button>}
          <small className="muted block">PNG, JPG ou WEBP · até 1 MB</small>
          {logoErr && <small className="err block">{logoErr}</small>}
        </div>
      </div>
      <label>Nome do catálogo<input name="name" defaultValue={store?.name} required /></label>
      <label>Endereço
        <div className="prefix"><span>/</span><input name="slug" defaultValue={store?.slug} placeholder="minha-loja" pattern="[a-z0-9-]{3,40}" /></div>
        {store && <small className="muted">Link público: {origin}/{store.slug} <button type="button" className="link" onClick={() => navigator.clipboard.writeText(`${location.origin}/${store.slug}`)}>copiar</button></small>}
      </label>
      <div className="row2">
        <label>Tipo de produto<input name="category" defaultValue={store?.category ?? ""} placeholder="Roupas, doces, artesanato…" /></label>
        <label>Cidade<input name="city" defaultValue={store?.city ?? ""} /></label>
      </div>
      <label>Sobre<textarea name="description" rows={3} defaultValue={store?.description ?? ""} /></label>
      <h3 className="sec">Contato</h3>
      <label>WhatsApp (com DDD)<input name="whatsapp" defaultValue={store?.whatsapp ?? ""} placeholder="11 99999-9999" inputMode="tel" /></label>
      <h3 className="sec">Pagamento e entrega</h3>
      <label>Formas de pagamento aceitas <small>separe por vírgula — o pagamento é combinado direto com você</small>
        <input name="payment_methods" defaultValue={store?.payment_methods.join(", ")} placeholder="Pix, Dinheiro, Cartão na entrega" /></label>
      <label>Entrega / retirada<input name="delivery_methods" defaultValue={store?.delivery_methods.join(", ")} placeholder="Retirada no local, Motoboy, Correios" /></label>
      <h3 className="sec">Visibilidade</h3>
      <label className="check"><input type="checkbox" name="published" defaultChecked={store?.published ?? true} /> Visível na busca e por link</label>
      {state.error && <p className="err">{state.error}</p>}
      {state.ok && <p className="ok">Salvo!</p>}
      <button className="btn primary" disabled={pending || up}>{pending ? "Salvando…" : store ? "Salvar alterações" : "Criar catálogo"}</button>
    </form>
  );
}
