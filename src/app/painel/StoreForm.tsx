"use client";
import { useActionState } from "react";
import { saveStore } from "./actions";
import type { Store } from "@/lib/utils";

export default function StoreForm({ store }: { store: Store | null }) {
  const [state, action, pending] = useActionState(saveStore, {});
  return (
    <form action={action} className="card form">
      <label>Nome da loja<input name="name" defaultValue={store?.name} required /></label>
      <label>Endereço do catálogo
        <div className="prefix"><span>/</span><input name="slug" defaultValue={store?.slug} placeholder="minha-loja" pattern="[a-z0-9-]{3,40}" /></div>
      </label>
      <div className="row2">
        <label>Tipo de produto<input name="category" defaultValue={store?.category ?? ""} placeholder="Roupas, doces, artesanato…" /></label>
        <label>Cidade<input name="city" defaultValue={store?.city ?? ""} /></label>
      </div>
      <label>Sobre a loja<textarea name="description" rows={3} defaultValue={store?.description ?? ""} /></label>
      <label>WhatsApp (com DDD)<input name="whatsapp" defaultValue={store?.whatsapp ?? ""} placeholder="11 99999-9999" inputMode="tel" /></label>
      <label>Formas de pagamento aceitas <small>separe por vírgula — o pagamento é combinado direto com você</small>
        <input name="payment_methods" defaultValue={store?.payment_methods.join(", ")} placeholder="Pix, Dinheiro, Cartão na entrega" /></label>
      <label>Entrega / retirada<input name="delivery_methods" defaultValue={store?.delivery_methods.join(", ")} placeholder="Retirada no local, Motoboy, Correios" /></label>
      <label className="check"><input type="checkbox" name="published" defaultChecked={store?.published ?? true} /> Catálogo visível na busca e por link</label>
      {state.error && <p className="err">{state.error}</p>}
      {state.ok && <p className="ok">Salvo!</p>}
      <button className="btn primary" disabled={pending}>{pending ? "Salvando…" : store ? "Salvar alterações" : "Criar minha loja"}</button>
    </form>
  );
}
