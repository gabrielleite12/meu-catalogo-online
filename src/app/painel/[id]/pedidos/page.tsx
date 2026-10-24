import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { brl } from "@/lib/utils";
import { buildStoreReply, cancelLine, deliveryLine, timeAgo, timeline, todayBR, whatsappLink } from "@/lib/orders";
import { setOrderStatus, returnItems, scheduleDelivery } from "../../actions";
import NotifyButton from "@/components/NotifyButton";
import SubmitButton from "@/components/SubmitButton";

const LABEL: Record<string, string> = { novo: "Novo", aprovado: "Aprovado", enviado: "Em trânsito", finalizado: "Entregue", cancelado: "Cancelado", devolvido: "Devolvido" };
const FILTERS = [["novo", "Novos"], ["aprovado", "Aprovados"], ["hoje", "📅 Entrega hoje"], ["enviado", "Em trânsito"], ["finalizado", "Entregues"], ["cancelado", "Cancelados"], ["devolvido", "Devolvidos"], ["todos", "Todos"]] as const;
type Item = { id: string; name: string; variant_name?: string | null; price: number | null; qty: number; qty_returned: number };
type Ret = { id: string; order_item_id: string; qty: number; restocked: boolean; reason: string | null };
const label = (i: { name: string; variant_name?: string | null }) => `${i.name}${i.variant_name ? ` (${i.variant_name})` : ""}`;
const SELECT = "*, order_items(id,name,variant_name,price,qty,qty_returned), order_returns(id,order_item_id,qty,restocked,reason)";

export default async function Pedidos({ params, searchParams }: {
  params: Promise<{ id: string }>; searchParams: Promise<{ s?: string; q?: string; devolver?: string; erro?: string; ok?: string }>;
}) {
  const { id } = await params;
  const { s, q, devolver, erro, ok } = await searchParams;
  const supabase = await supabaseServer();
  await supabase.rpc("auto_deliver_orders"); // enviado e sem confirmação há 7 dias vira entregue
  const code = Number(devolver);
  const [{ data, error: loadError }, { data: store }, { data: ret }] = await Promise.all([
    supabase.from("orders").select(SELECT).eq("store_id", id).order("created_at", { ascending: false }).limit(200),
    supabase.from("stores").select("name").eq("id", id).maybeSingle(),
    Number.isInteger(code) && code > 0
      ? supabase.from("orders").select(SELECT).eq("store_id", id).eq("code", code).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const all = data ?? [];
  const today = todayBR();
  const open = (o: { status: string }) => o.status === "novo" || o.status === "aprovado" || o.status === "enviado";
  const isToday = (o: { status: string; delivery_date: string | null }) => open(o) && o.delivery_date === today;
  const isLate = (o: { status: string; delivery_date: string | null }) => open(o) && !!o.delivery_date && o.delivery_date < today;
  const match = (o: { status: string; delivery_date: string | null }, st: string) => st === "todos" ? true : st === "hoje" ? isToday(o) : o.status === st;
  const count = (st: string) => all.filter((o) => match(o, st)).length;
  const late = all.filter(isLate).length;
  const filter = FILTERS.some(([k]) => k === s) ? s! : count("novo") ? "novo" : "todos";
  const term = (q ?? "").trim().toLowerCase();
  const list = all.filter((o) =>
    match(o, filter) &&
    (!term || `#${o.code} ${o.customer_name} ${o.customer_phone}`.toLowerCase().includes(term)));
  const net = (o: { order_items: Item[] }) => o.order_items.reduce((a, i) => a + (i.price ?? 0) * (i.qty - i.qty_returned), 0);
  const openTotal = all.filter((o) => o.status === "novo").reduce((a, o) => a + (o.total ?? 0), 0);
  const sold = all.filter((o) => o.status === "finalizado").reduce((a, o) => a + net(o), 0);
  const transit = all.filter((o) => o.status === "enviado");
  const units = transit.reduce((a, o) => a + o.order_items.reduce((b: number, i: Item) => b + i.qty - i.qty_returned, 0), 0);
  const href = (st: string) => `?s=${st}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const here = `/painel/${id}/pedidos`;

  const returnable = ret && (ret.status === "enviado" || ret.status === "finalizado");

  return (
    <>
      <h2>Pedidos</h2>
      <p className="muted">O cliente envia o pedido pelo WhatsApp e ele fica registrado aqui. O estoque é reservado ao pedir. <b>Aprove</b> o pedido para confirmar que vai atender e marque <b>enviado</b> quando sair para entrega; o cliente confirma o recebimento (ou vira <b>entregue</b> sozinho em 7 dias) e então pode avaliar. Cancelar (com motivo) ou devolver itens devolve ao estoque, e o cliente é avisado de quem cancelou e por quê.</p>
      {loadError && <p className="err">Não foi possível carregar os pedidos ({loadError.message}). Confira se a migração 010 foi aplicada no Supabase.</p>}
      <NotifyButton variant="card" hint="Receba um aviso no celular a cada novo pedido e quando o cliente confirmar a entrega." />
      {late > 0 && <p className="alert">⚠ {late} {late === 1 ? "entrega atrasada" : "entregas atrasadas"} — confira a data combinada.</p>}
      {count("hoje") > 0 && <p className="alert soft">📅 {count("hoje")} {count("hoje") === 1 ? "entrega marcada" : "entregas marcadas"} para hoje.</p>}
      {ok && <p className="ok">✓ {ok}</p>}

      <div className="stats">
        <div className="card"><small className="muted">Aguardando você</small><b>{count("novo")}</b><span className="muted">{brl(openTotal) || "—"}</span></div>
        <div className="card"><small className="muted">Em trânsito</small><b>{transit.length}</b><span className="muted">{units} {units === 1 ? "unidade" : "unidades"}</span></div>
        <div className="card"><small className="muted">Entregues</small><b>{count("finalizado")}</b><span className="muted">{sold ? brl(sold) : "—"}</span></div>
        <div className="card"><small className="muted">Cancelados</small><b>{count("cancelado")}</b><span className="muted">{count("aprovado")} aprovado(s) em preparo</span></div>
      </div>

      <details className="card retbox" open={!!devolver}>
        <summary><b>↩ Devolução rápida</b> <span className="muted">— digite o nº do pedido</span></summary>
        <form className="toolbar" action="">
          <input type="number" name="devolver" min={1} defaultValue={devolver ?? ""} placeholder="Nº do pedido, ex.: 12" required />
          <button className="btn sm">Buscar pedido</button>
        </form>
        {erro && <p className="err">{erro}</p>}
        {devolver && !ret && <p className="err">Pedido #{devolver} não encontrado nesta loja.</p>}
        {ret && !returnable && <p className="err">O pedido #{ret.code} está {LABEL[ret.status].toLowerCase()} — só dá para devolver itens de pedidos em trânsito ou entregues.</p>}
        {ret && returnable && (
          <form action={returnItems} className="form">
            <input type="hidden" name="id" value={ret.id} />
            <input type="hidden" name="store" value={id} />
            <input type="hidden" name="back" value={`${here}?devolver=${ret.code}`} />
            <p><b>Pedido #{ret.code}</b> · {ret.customer_name} · <span className="muted">{LABEL[ret.status]}</span></p>
            {(ret.order_items as Item[]).map((i) => {
              const left = i.qty - i.qty_returned;
              return (
                <div className="retrow" key={i.id}>
                  <span>{label(i)}<small className="muted"> · pediu {i.qty}{i.qty_returned ? `, já devolveu ${i.qty_returned}` : ""}</small></span>
                  {left > 0 ? (
                    <>
                      <input type="number" name={"qty_" + i.id} min={0} max={left} defaultValue={0} aria-label={`Devolvidos de ${i.name}`} />
                      <label className="chk"><input type="checkbox" name={"descartar_" + i.id} /> não repor (defeito)</label>
                    </>
                  ) : <small className="ok">tudo devolvido</small>}
                </div>
              );
            })}
            <label>Motivo (opcional)<input name="reason" maxLength={300} placeholder="Ex.: tamanho errado, produto com defeito" /></label>
            <SubmitButton className="btn primary" pendingText="Registrando…" confirm={`Registrar a devolução do pedido #${ret.code}?`}>Registrar devolução</SubmitButton>
            <small className="muted">Itens repostos voltam ao estoque; os marcados como "não repor" são descartados.</small>
          </form>
        )}
      </details>

      <div className="chipbar">
        {FILTERS.map(([k, l]) => (
          <Link key={k} href={href(k)} className={"fchip" + (filter === k ? " on" : "")}>{l}<b>{count(k)}</b></Link>
        ))}
      </div>
      <form className="toolbar nowrap" action="">
        <input type="hidden" name="s" value={filter} />
        <input type="text" name="q" defaultValue={q ?? ""} placeholder="Buscar por nº do pedido, nome ou telefone" />
        <button className="btn sm">Buscar</button>
        {term && <Link className="btn ghost sm" href={href(filter)}>Limpar</Link>}
      </form>

      {!list.length && <p className="muted">{all.length ? "Nenhum pedido neste filtro." : "Nenhum pedido ainda."}</p>}
      <div className="stack">
        {list.map((o) => {
          const items = o.order_items as Item[];
          const names = new Map(items.map((i) => [i.id, label(i)]));
          return (
            <div className="card prod ord" key={o.id}>
              <div className="between">
                <strong>Pedido #{o.code}</strong>
                <span className={"status " + o.status}>{LABEL[o.status]}</span>
              </div>
              <p className="muted">
                {new Date(o.created_at).toLocaleString("pt-BR")} · {timeAgo(o.created_at)}
                {o.status === "enviado" && o.shipped_at && <> · enviado {timeAgo(o.shipped_at)}</>}
              </p>
              <p><b>{o.customer_name}</b> · {o.customer_phone}<br /><span className="muted">{o.delivery_type === "retirada" ? "🏬 Retirada na loja" : o.customer_address}</span></p>
              <p className="hist" aria-label="Histórico">{timeline(o).map((t) => <span key={t.label}>{t.label} {t.at}</span>)}</p>
              {o.status === "cancelado" && (
                <p className="cancelinfo">✕ {cancelLine(o)}{o.stock_reserved && <><br />↩ Os itens voltaram ao estoque.</>}</p>
              )}
              {o.delivery_date && open(o) && (
                <p className={"deliv" + (isLate(o) ? " late" : isToday(o) ? " today" : "")}>
                  📅 Entrega: <b>{deliveryLine(o.delivery_date, o.delivery_note)}</b>{isToday(o) && " · hoje"}{isLate(o) && " · atrasada"}
                </p>
              )}
              <ul className="items">
                {items.map((i) => (
                  <li key={i.id}>{i.qty}× {label(i)} <span className="muted">{i.price != null ? brl(i.price * i.qty) : "sob consulta"}</span>
                    {i.qty_returned > 0 && <small className="ret"> ↩ {i.qty_returned} devolvido(s)</small>}</li>
                ))}
              </ul>
              {(o.order_returns as Ret[]).length > 0 && (
                <p className="muted retlog">{(o.order_returns as Ret[]).map((r) =>
                  `↩ ${r.qty}× ${names.get(r.order_item_id) ?? "item"} — ${r.restocked ? "voltou ao estoque" : "descartado"}${r.reason ? ` (${r.reason})` : ""}`).join(" · ")}</p>
              )}
              {o.delivery_type !== "retirada" && o.shipping_label && (
                <p className="freteline"><span>🚚 {o.shipping_label}</span><b>{o.shipping_fee ? `${brl(o.shipping_fee)}${o.shipping_added ? "" : " (à parte)"}` : ""}</b></p>
              )}
              {o.notes && <p className="note">📝 {o.notes}</p>}
              <div className="between ordfoot">
                <b>{o.total ? brl(o.total) : ""}</b>
                <div className="actions">
                  <a className="btn whats sm" target="_blank" rel="noreferrer"
                    href={whatsappLink(o.customer_phone, buildStoreReply(o, store?.name ?? ""))}>
                    {o.status === "novo" || o.status === "aprovado" ? "Falar com o cliente" : o.status === "enviado" ? "Avisar que saiu" : "Falar com o cliente"}
                  </a>
                  {(o.status === "enviado" || o.status === "finalizado") && (
                    <Link className="btn sm" href={`?devolver=${o.code}`}>Devolução</Link>
                  )}
                  {open(o) && (
                    <details className="sched">
                      <summary className="btn sm">📅 {o.delivery_date ? "Reagendar" : "Agendar entrega"}</summary>
                      <form action={scheduleDelivery} className="schedform">
                        <input type="hidden" name="id" value={o.id} />
                        <label>Dia da entrega<input type="date" name="date" min={today} defaultValue={o.delivery_date ?? ""} required /></label>
                        <label>Horário / observação<input name="note" maxLength={200} defaultValue={o.delivery_note ?? ""} placeholder="ex.: entre 14h e 18h" /></label>
                        <SubmitButton className="btn primary sm" pendingText="Salvando…">Salvar e avisar o cliente</SubmitButton>
                      </form>
                    </details>
                  )}
                  {open(o) && (
                    <form action={setOrderStatus} className="actions">
                      <input type="hidden" name="id" value={o.id} />
                      {o.status === "novo" && <SubmitButton className="btn primary sm" name="status" value="aprovado" pendingText="Aprovando…">Aprovar pedido</SubmitButton>}
                      {(o.status === "novo" || o.status === "aprovado") && <SubmitButton className={o.status === "aprovado" ? "btn primary sm" : "btn sm"} name="status" value="enviado" pendingText="Enviando…">Marcar como enviado</SubmitButton>}
                      <SubmitButton className={o.status === "enviado" ? "btn primary sm" : "btn sm"} name="status" value="finalizado" pendingText="Salvando…"
                        confirm={`Marcar o pedido #${o.code} como entregue?`}>{o.status === "enviado" ? "Marcar como entregue" : "Retirado/entregue"}</SubmitButton>
                    </form>
                  )}
                </div>
              </div>
              {open(o) && (
                <details className="cancelbox">
                  <summary className="muted">Cancelar este pedido…</summary>
                  <form action={setOrderStatus}>
                    <input type="hidden" name="id" value={o.id} />
                    <select name="reason" aria-label="Motivo do cancelamento" defaultValue="">
                      <option value="">Motivo (opcional)</option>
                      <option>Produto sem estoque</option><option>Não conseguimos entregar no endereço</option>
                      <option>Cliente pediu o cancelamento</option><option>Pagamento não confirmado</option><option>Pedido duplicado</option>
                    </select>
                    <SubmitButton className="btn danger sm" name="status" value="cancelado" pendingText="Cancelando…"
                      confirm={`Cancelar o pedido #${o.code}? O estoque reservado volta e o cliente será avisado.`}>Cancelar pedido</SubmitButton>
                  </form>
                </details>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
}
