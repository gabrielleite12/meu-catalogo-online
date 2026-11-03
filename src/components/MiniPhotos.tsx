"use client";
import { useState } from "react";

// Faixa de fotos pequenas no resumo do pedido: mostra até 3 e quantas ficaram de fora.
export default function MiniPhotos({ files }: { files: (string | undefined)[] }) {
  const [bad, setBad] = useState<Record<number, boolean>>({});
  const shown = files.slice(0, 3);
  const more = files.length - shown.length;
  return (
    <span className="minis" aria-hidden="true">
      {shown.map((f, i) => (
        <span key={i} className="mini">
          {f && !bad[i] ? <img src={`/api/img/${f}?s=120`} alt="" loading="lazy" onError={() => setBad((b) => ({ ...b, [i]: true }))} /> : "📦"}
        </span>
      ))}
      {more > 0 && <span className="mini more">+{more}</span>}
    </span>
  );
}
