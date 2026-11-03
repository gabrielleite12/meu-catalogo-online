"use client";
import { useEffect, useState } from "react";

// Miniatura da foto de um item; ao tocar, abre ampliada. Se a foto não carregar, mostra um ícone.
export default function ItemPhoto({ file, alt }: { file?: string; alt: string }) {
  const [open, setOpen] = useState(false);
  const [bad, setBad] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [open]);

  if (!file || bad) return <span className="pthumb nophoto" aria-hidden="true">📦</span>;
  return (
    <>
      <button type="button" className="pthumb zoomable" onClick={() => setOpen(true)} aria-label={`Ampliar foto: ${alt}`}>
        <img src={`/api/img/${file}?s=160`} alt={alt} loading="lazy" onError={() => setBad(true)} />
      </button>
      {open && (
        <div className="photoview" role="dialog" aria-modal="true" aria-label={alt} onClick={() => setOpen(false)}>
          <img src={`/api/img/${file}?s=1200`} alt={alt} />
          <span className="cap">{alt}</span>
          <button type="button" className="close" aria-label="Fechar">✕</button>
        </div>
      )}
    </>
  );
}
