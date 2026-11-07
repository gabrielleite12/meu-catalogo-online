import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { brl, type Seller } from "@/lib/utils";
import SubmitButton from "@/components/SubmitButton";
import { saveSeller, toggleSeller, deleteSeller } from "../../actions";

interface OrderStat {
  id: string;
  seller_id: string | null;
  status: string;
  total: number | null;
}

export default async function VendedoresPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string; editar?: string }>;
}) {
  const { id } = await params;
  const { ok, erro, editar } = await searchParams;
  const supabase = await supabaseServer();

  // Busca todos os vendedores da loja
  const [{ data: sellersData }, { data: ordersData }, { data: store }] = await Promise.all([
    supabase
      .from("sellers")
      .select("*")
      .eq("store_id", id)
      .order("created_at", { ascending: true }),
    supabase
      .from("orders")
      .select("id,seller_id,status,total")
      .eq("store_id", id),
    supabase
      .from("stores")
      .select("name,slug")
      .eq("id", id)
      .maybeSingle(),
  ]);

  const sellers = (sellersData ?? []) as Seller[];
  const orders = (ordersData ?? []) as OrderStat[];

  // Calcula métricas por vendedor
  const statsBySeller = new Map<
    string,
    { totalOrders: number; finishedOrders: number; totalSales: number }
  >();

  orders.forEach((o) => {
    if (!o.seller_id) return;
    const current = statsBySeller.get(o.seller_id) || {
      totalOrders: 0,
      finishedOrders: 0,
      totalSales: 0,
    };
    current.totalOrders += 1;
    if (o.status === "finalizado" || o.status === "enviado" || o.status === "aprovado") {
      current.finishedOrders += 1;
      current.totalSales += Number(o.total || 0);
    }
    statsBySeller.set(o.seller_id, current);
  });

  const totalComVendedor = orders.filter((o) => !!o.seller_id).length;
  const totalGeralPedidos = orders.length;

  const sellerToEdit = editar ? sellers.find((s) => s.id === editar) : null;

  return (
    <div className="vendedores-page">
      <h2>Vendedores da Loja</h2>
      <p className="muted">
        Cadastre seus vendedores e consultores. Na hora de finalizar o pedido (PO) no carrinho,
        o cliente pode selecionar quem o atendeu. Você poderá acompanhar o total de vendas,
        faturamento e pedidos de cada vendedor individualmente.
      </p>

      {ok && <p className="ok">✓ {ok}</p>}
      {erro && <p className="err">{erro}</p>}

      {/* Cards de Resumo Geral */}
      <div className="stats-row" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", margin: "16px 0 24px" }}>
        <div className="card" style={{ padding: "14px 18px" }}>
          <small className="muted">Vendedores Cadastrados</small>
          <div style={{ fontSize: "24px", fontWeight: "700" }}>{sellers.length}</div>
          <small className="muted">{sellers.filter((s) => s.active).length} ativos</small>
        </div>

        <div className="card" style={{ padding: "14px 18px" }}>
          <small className="muted">Pedidos com Vendedor</small>
          <div style={{ fontSize: "24px", fontWeight: "700" }}>{totalComVendedor}</div>
          <small className="muted">de {totalGeralPedidos} pedidos no total</small>
        </div>

        <div className="card" style={{ padding: "14px 18px" }}>
          <small className="muted">Faturamento via Vendedores</small>
          <div style={{ fontSize: "24px", fontWeight: "700", color: "var(--brand, #16803c)" }}>
            {brl(
              Array.from(statsBySeller.values()).reduce((sum, s) => sum + s.totalSales, 0)
            )}
          </div>
          <small className="muted">pedidos aprovados/entregues</small>
        </div>
      </div>

      {/* Formulário de Cadastro / Edição de Vendedor */}
      <details className="card" open={!!sellerToEdit} style={{ marginBottom: "24px" }}>
        <summary style={{ padding: "14px 18px", cursor: "pointer", fontWeight: "600" }}>
          {sellerToEdit ? `Editar vendedor: ${sellerToEdit.name}` : "➕ Cadastrar novo vendedor"}
        </summary>
        <form action={saveSeller} style={{ padding: "0 18px 18px" }}>
          <input type="hidden" name="store" value={id} />
          {sellerToEdit && <input type="hidden" name="id" value={sellerToEdit.id} />}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px", marginBottom: "14px" }}>
            <label>
              Nome do vendedor *
              <input
                name="name"
                defaultValue={sellerToEdit?.name ?? ""}
                placeholder="Ex: Carlos Silva"
                required
              />
            </label>

            <label>
              Código / Matrícula (opcional)
              <input
                name="code"
                defaultValue={sellerToEdit?.code ?? ""}
                placeholder="Ex: VEND-01 ou CS"
              />
            </label>

            <label>
              WhatsApp do vendedor (opcional)
              <input
                name="phone"
                defaultValue={sellerToEdit?.phone ?? ""}
                placeholder="Ex: 11999998888"
              />
            </label>

            <label>
              E-mail do vendedor (opcional)
              <input
                name="email"
                type="email"
                defaultValue={sellerToEdit?.email ?? ""}
                placeholder="carlos@exemplo.com"
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <SubmitButton className="btn primary" pendingText="Salvando...">
              {sellerToEdit ? "Salvar alterações" : "Cadastrar vendedor"}
            </SubmitButton>
            {sellerToEdit && (
              <Link href={`/painel/${id}/vendedores`} className="btn ghost">
                Cancelar
              </Link>
            )}
          </div>
        </form>
      </details>

      {/* Lista de Vendedores */}
      <h3>Equipe de Vendas ({sellers.length})</h3>
      {!sellers.length && (
        <p className="muted" style={{ padding: "20px 0" }}>
          Nenhum vendedor cadastrado ainda. Use o formulário acima para cadastrar os vendedores da sua loja.
        </p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "12px" }}>
        {sellers.map((s) => {
          const stats = statsBySeller.get(s.id) || {
            totalOrders: 0,
            finishedOrders: 0,
            totalSales: 0,
          };

          return (
            <div
              key={s.id}
              className="card"
              style={{
                padding: "16px",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                opacity: s.active ? 1 : 0.6,
                borderLeft: s.active ? "4px solid var(--brand, #16803c)" : "4px solid #94a3b8",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: "200px" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "50%",
                    background: s.active ? "rgba(22, 128, 60, 0.15)" : "#e2e8f0",
                    color: s.active ? "var(--brand, #16803c)" : "#64748b",
                    fontWeight: "700",
                    display: "grid",
                    placeItems: "center",
                    fontSize: "16px",
                    flexShrink: 0,
                  }}
                >
                  {s.name[0]?.toUpperCase()}
                </div>
                <div>
                  <strong>{s.name}</strong>
                  {s.code && (
                    <span
                      style={{
                        marginLeft: "6px",
                        fontSize: "11px",
                        background: "#e2e8f0",
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontWeight: 600,
                      }}
                    >
                      {s.code}
                    </span>
                  )}
                  <div className="muted" style={{ fontSize: "13px" }}>
                    {s.phone ? `WhatsApp: ${s.phone}` : "Sem telefone"}
                    {s.email ? ` · ${s.email}` : ""}
                  </div>
                </div>
              </div>

              {/* Métricas do Vendedor */}
              <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
                <div style={{ textAlign: "center", minWidth: "80px" }}>
                  <small className="muted block" style={{ fontSize: "11px" }}>Total Pedidos</small>
                  <strong style={{ fontSize: "16px" }}>{stats.totalOrders}</strong>
                </div>

                <div style={{ textAlign: "center", minWidth: "90px" }}>
                  <small className="muted block" style={{ fontSize: "11px" }}>Total Vendido</small>
                  <strong style={{ fontSize: "16px", color: "var(--brand, #16803c)" }}>
                    {brl(stats.totalSales)}
                  </strong>
                </div>

                <Link
                  href={`/painel/${id}/pedidos?vendedor=${s.id}`}
                  className="btn sm ghost"
                  title="Ver pedidos atendidos por este vendedor"
                >
                  Ver pedidos ↗
                </Link>
              </div>

              {/* Ações (Editar, Ativar/Desativar, Excluir) */}
              <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                <Link
                  href={`/painel/${id}/vendedores?editar=${s.id}`}
                  className="btn sm"
                >
                  Editar
                </Link>

                <form action={toggleSeller}>
                  <input type="hidden" name="store" value={id} />
                  <input type="hidden" name="id" value={s.id} />
                  <input type="hidden" name="active" value={s.active ? "true" : "false"} />
                  <SubmitButton
                    className={`btn sm ${s.active ? "ghost" : "primary"}`}
                    pendingText="..."
                  >
                    {s.active ? "Desativar" : "Ativar"}
                  </SubmitButton>
                </form>

                <form
                  action={deleteSeller}
                  onSubmit={(e) => {
                    if (!confirm(`Tem certeza que deseja excluir o vendedor ${s.name}?`)) {
                      e.preventDefault();
                    }
                  }}
                >
                  <input type="hidden" name="store" value={id} />
                  <input type="hidden" name="id" value={s.id} />
                  <SubmitButton className="btn sm danger" pendingText="...">
                    ✕
                  </SubmitButton>
                </form>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
