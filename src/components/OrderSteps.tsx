const STEPS = [["novo", "Pedido feito"], ["aprovado", "Aprovado"], ["enviado", "A caminho"], ["finalizado", "Entregue"]] as const;

// Barra de andamento do pedido (não aparece em pedidos cancelados).
export default function OrderSteps({ status }: { status: string }) {
  if (status === "cancelado") return null;
  const finished = status === "finalizado" || status === "devolvido";
  const at = finished ? STEPS.length - 1 : Math.max(0, STEPS.findIndex(([k]) => k === status));
  return (
    <ol className="steps" aria-label="Andamento do pedido">
      {STEPS.map(([k, label], i) => (
        <li key={k} className={i < at || (finished && i === at) ? "done" : i === at ? "now" : ""} aria-current={i === at ? "step" : undefined}><i>{i < at || (finished && i === at) ? "✓" : i + 1}</i><span>{label}</span></li>
      ))}
    </ol>
  );
}
