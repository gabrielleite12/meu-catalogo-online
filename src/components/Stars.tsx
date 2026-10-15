"use client";
import { useState } from "react";

export function Stars({ value, count }: { value: number; count?: number }) {
  const r = Math.round(value);
  return (
    <span className="stars" title={`${value} de 5`}>
      {"★★★★★".split("").map((_, i) => <i key={i} className={i < r ? "on" : ""}>★</i>)}
      <small className="muted"> {value.toFixed(1)}{count != null && ` (${count})`}</small>
    </span>
  );
}

export function StarInput({ name }: { name: string }) {
  const [v, setV] = useState(0);
  return (
    <span className="stars input">
      <input type="hidden" name={name} value={v} />
      {[1, 2, 3, 4, 5].map((n) => (
        <button type="button" key={n} className={n <= v ? "on" : ""} onClick={() => setV(n)} aria-label={`${n} estrelas`}>★</button>
      ))}
    </span>
  );
}
