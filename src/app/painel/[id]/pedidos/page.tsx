import { supabaseServer } from "@/lib/supabase/server";
import { brl } from "@/lib/utils";
import { setOrderStatus } from "../../actions";

const LABEL: Record<string, string> = { novo: "Novo", finalizado: "Finalizado", cancelado: "Cancelado" };

export default async function Pedidos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await supabaseServer();
  const { data } = await supabase
    .from("orders").select("*, order_items(id,name,variant_name,price,qty)")
    .eq("store_id", id).order("created_at", { ascending: false }).limit(100);
  return (
    <>
      <h2>Pedidos</h2>
      <p className="muted">O cliente envia o pedido pelo WhatsApp e ele fica registrado aqui. Ao marcar como <b>finalizado</b>, o estoque dos itens controlados é baixado e o cliente passa a poder avaliar sua loja e os produtos.</p>
      {!data?.length && <p className="muted">Nenhum pedido ainda.</p>}
      <div className="stack">
        {(data ?? []).map((o) => (
          <div className="card prod" key={o.id}>
            <div className="between">
              <strong>Pedido #{o.code} · {new Date(o.created_at).toLocaleString("pt-BR")}</strong>
              <span className={"status " + o.status}>{LABEL[o.status]}</span>
            </div>
            <p><b>{o.customer_name}</b> · {o.customer_phone}<br /><span className="muted">{o.customer_address}</span></p>
            <ul className="items">
              {o.order_items.map((i: { id: string; name: string; variant_name?: string | null; price: number | null; qty: number }) => (
                <li key={i.id}>{i.qty}× {i.name}{i.variant_name ? ` (${i.variant_name})` : ""} <span className="muted">{i.price != null ? brl(i.price * i.qty) : "sob consulta"}</span></li>
              ))}
            </ul>
            {o.notes && <p className="muted">Obs.: {o.notes}</p>}
            <div className="between">
              <b>{o.total ? brl(o.total) : ""}</b>
              {o.status === "novo" && (
                <form action={setOrderStatus} className="actions">
                  <input type="hidden" name="id" value={o.id} />
                  <button className="btn primary" name="status" value="finalizado">Marcar como finalizado</button>
                  <button className="btn danger" name="status" value="cancelado">Cancelar</button>
                </form>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
