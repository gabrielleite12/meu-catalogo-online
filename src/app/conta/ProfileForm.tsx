"use client";
import { useActionState } from "react";
import { saveProfile } from "./actions";

type P = { name: string; phone: string; zip: string | null; street: string; number: string; complement: string | null; district: string | null; city: string; state: string };

export default function ProfileForm({ profile, next, defaultName }: { profile: P | null; next?: string; defaultName?: string }) {
  const [st, act, pending] = useActionState(saveProfile, {});
  return (
    <form action={act} className="card form">
      {next && <input type="hidden" name="next" value={next} />}
      <label>Nome completo<input name="name" defaultValue={profile?.name ?? defaultName} required /></label>
      <label>WhatsApp (com DDD)<input name="phone" defaultValue={profile?.phone} inputMode="tel" placeholder="11 99999-9999" required /></label>
      <div className="row2">
        <label>CEP<input name="zip" defaultValue={profile?.zip ?? ""} inputMode="numeric" /></label>
        <label>Bairro<input name="district" defaultValue={profile?.district ?? ""} /></label>
      </div>
      <div className="row2">
        <label>Rua<input name="street" defaultValue={profile?.street} required /></label>
        <label>Número<input name="number" defaultValue={profile?.number} required /></label>
      </div>
      <label>Complemento<input name="complement" defaultValue={profile?.complement ?? ""} /></label>
      <div className="row2">
        <label>Cidade<input name="city" defaultValue={profile?.city} required /></label>
        <label>UF<input name="state" defaultValue={profile?.state} maxLength={2} required /></label>
      </div>
      {st.error && <p className="err">{st.error}</p>}
      {st.ok && <p className="ok">Cadastro salvo!</p>}
      <button className="btn primary" disabled={pending}>{pending ? "Salvando…" : "Salvar cadastro"}</button>
    </form>
  );
}
