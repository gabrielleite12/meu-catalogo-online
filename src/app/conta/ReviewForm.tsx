"use client";
import { useActionState } from "react";
import { StarInput } from "@/components/Stars";

export default function ReviewForm({ action, fields, label }: {
  action: (s: unknown, fd: FormData) => Promise<{ error?: string; ok?: boolean }>;
  fields: Record<string, string>; label: string;
}) {
  const [st, act, pending] = useActionState(action, {});
  if (st.ok) return <p className="ok">✓ Avaliação enviada, obrigado!</p>;
  return (
    <form action={act} className="review">
      {Object.entries(fields).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
      <div className="between"><span>{label}</span><StarInput name="rating" /></div>
      <textarea name="comment" rows={2} maxLength={1000} placeholder="Conte como foi (opcional)" />
      {st.error && <p className="err">{st.error}</p>}
      <button className="btn sm primary" disabled={pending}>Enviar avaliação</button>
    </form>
  );
}
