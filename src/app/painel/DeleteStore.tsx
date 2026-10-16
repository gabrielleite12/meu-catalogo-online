"use client";
import { useState } from "react";
import { deleteStore } from "./actions";

export default function DeleteStore({ id, name, small }: { id: string; name: string; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const ok = typed.trim().toLowerCase() === name.trim().toLowerCase();
  return (
    <>
      <button type="button" className={"btn danger" + (small ? " sm" : "")} onClick={() => setOpen(true)}>Excluir{small ? "" : " este catálogo"}</button>
      {open && (
        <div className="overlay center-overlay" onClick={() => setOpen(false)}>
          <form action={deleteStore} className="card narrow form" onClick={(e) => e.stopPropagation()}>
            <input type="hidden" name="id" value={id} />
            <h3>Excluir “{name}”?</h3>
            <p className="muted">Isso apaga <b>todos os produtos, variações, pedidos e avaliações</b> deste catálogo. Suas fotos no Google Drive não são afetadas. Não pode ser desfeito.</p>
            <label>Digite <b>{name}</b> para confirmar<input value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus /></label>
            <div className="actions">
              <button type="button" className="btn" onClick={() => setOpen(false)}>Cancelar</button>
              <button className="btn danger" disabled={!ok}>Excluir definitivamente</button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
