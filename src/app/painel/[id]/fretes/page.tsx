import { supabaseServer } from "@/lib/supabase/server";
import { ruleSummary, ruleWhere, UFS, type ShippingRule } from "@/lib/shipping";
import { saveShippingSettings, saveShippingRule, deleteShippingRule } from "../../actions";
import SubmitButton from "@/components/SubmitButton";

const MODES = [["pago", "Cobrar um valor"], ["gratis", "Frete grátis"], ["combinar", "A combinar com o cliente"], ["nao_entrega", "Não entrego"]] as const;

function RuleForm({ store, rule, city }: { store: string; rule?: ShippingRule; city?: string | null }) {
  return (
    <form action={saveShippingRule} className="form ruleform">
      <input type="hidden" name="store" value={store} />
      {rule && <input type="hidden" name="id" value={rule.id} />}
      <div className="row2">
        <label>Onde
          <select name="scope" defaultValue={rule?.scope ?? "city"}>
            <option value="city">Uma cidade</option>
            <option value="state">Um estado inteiro</option>
            <option value="other">Todos os outros lugares</option>
          </select>
        </label>
        <label>Cidade <small>(se for uma cidade)</small>
          <input name="city" defaultValue={rule?.city ?? ""} placeholder={city ? `Ex.: ${city}` : "Nome da cidade"} />
        </label>
      </div>
      <div className="row2">
        <label>Estado (UF) <small>(opcional para cidade)</small>
          <select name="state" defaultValue={rule?.state ?? ""}>
            <option value="">—</option>
            {UFS.map((u) => <option key={u}>{u}</option>)}
          </select>
        </label>
        <label>O que acontece
          <select name="mode" defaultValue={rule?.mode ?? "pago"}>
            {MODES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
      </div>
      <div className="row2">
        <label>Valor do frete (R$) <small>só se for cobrar</small>
          <input name="fee" inputMode="decimal" defaultValue={rule?.fee ?? ""} placeholder="12,00" />
        </label>
        <label>Grátis a partir de (R$) <small>opcional</small>
          <input name="free_above" inputMode="decimal" defaultValue={rule?.free_above ?? ""} placeholder="150,00" />
        </label>
      </div>
      <label>Observação para o cliente <small>opcional</small>
        <input name="note" maxLength={120} defaultValue={rule?.note ?? ""} placeholder="Ex.: entrega em até 2 dias úteis" />
      </label>
      <SubmitButton className="btn primary sm" pendingText="Salvando…">{rule ? "Salvar regra" : "Adicionar regra"}</SubmitButton>
    </form>
  );
}

export default async function Fretes({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const supabase = await supabaseServer();
  const { data: store } = await supabase.from("stores").select("city,shipping_add_to_total,pickup_enabled").eq("id", id).maybeSingle();
  const { data, error } = await supabase.from("shipping_rules").select("*").eq("store_id", id).order("position").order("created_at");
  const rules = (data ?? []) as ShippingRule[];
  // a cidade da loja pode estar escrita como "Campinas, SP": separa o nome da UF
  const [cityName, cityUf] = (store?.city ?? "").split(/\s*[,/-]\s*/);
  const uf = /^[A-Za-z]{2}$/.test(cityUf ?? "") ? cityUf.toUpperCase() : "";

  return (
    <>
      <h2>Fretes</h2>
      <p className="muted">Diga quanto cobra (ou se não cobra) por região. O cliente vê o frete no carrinho de acordo com a cidade e o estado do cadastro dele, e o valor vai no pedido. Vale a regra mais específica: <b>cidade</b>, depois <b>estado</b>, depois <b>todos os outros lugares</b>. Sem nenhuma regra, o frete fica "a combinar".</p>
      {error && <p className="err">Não foi possível carregar os fretes ({error.message}). Confira se a migração 012 foi aplicada no Supabase.</p>}
      {ok && <p className="ok">✓ {ok}</p>}
      {erro && <p className="err">{erro}</p>}

      <form action={saveShippingSettings} className="card form">
        <input type="hidden" name="store" value={id} />
        <h3 className="sec">Como mostrar o frete</h3>
        <label className="check"><input type="radio" name="add_to_total" value="1" defaultChecked={store?.shipping_add_to_total ?? true} /> <span><b>Somar ao total do pedido</b> — o valor final já inclui o frete</span></label>
        <label className="check"><input type="radio" name="add_to_total" value="0" defaultChecked={store ? !store.shipping_add_to_total : false} /> <span><b>Só informar</b> — o frete aparece no pedido, mas não entra no total (cobrado à parte)</span></label>
        <label className="check"><input type="checkbox" name="pickup" defaultChecked={store?.pickup_enabled ?? false} /> <span><b>Aceito retirada na loja</b> — o cliente pode escolher retirar, sem frete</span></label>
        <SubmitButton className="btn primary sm" pendingText="Salvando…">Salvar</SubmitButton>
      </form>

      <h3 className="sec">Atalhos</h3>
      <div className="shortcuts">
        {cityName && (
          <form action={saveShippingRule}>
            <input type="hidden" name="store" value={id} /><input type="hidden" name="scope" value="city" /><input type="hidden" name="city" value={cityName} /><input type="hidden" name="state" value={uf} /><input type="hidden" name="mode" value="gratis" />
            <SubmitButton className="btn sm" pendingText="…">+ Frete grátis em {cityName}</SubmitButton>
          </form>
        )}
        <form action={saveShippingRule}>
          <input type="hidden" name="store" value={id} /><input type="hidden" name="scope" value="other" /><input type="hidden" name="mode" value="combinar" />
          <SubmitButton className="btn sm" pendingText="…">+ Outros lugares: a combinar</SubmitButton>
        </form>
        <form action={saveShippingRule}>
          <input type="hidden" name="store" value={id} /><input type="hidden" name="scope" value="other" /><input type="hidden" name="mode" value="nao_entrega" />
          <SubmitButton className="btn sm" pendingText="…">+ Não entregar em outros lugares</SubmitButton>
        </form>
      </div>

      <h3 className="sec">Suas regras <span className="muted">({rules.length})</span></h3>
      {!rules.length && <p className="muted">Nenhuma regra ainda — o frete aparece como "a combinar". Use um atalho acima ou crie uma regra abaixo.</p>}
      <div className="stack">
        {rules.map((r) => (
          <div className="card prod rule" key={r.id}>
            <div className="between">
              <span><b>{ruleWhere(r)}</b> <span className="muted">→ {ruleSummary(r)}</span>{r.note && <small className="muted block">{r.note}</small>}</span>
              <form action={deleteShippingRule}>
                <input type="hidden" name="store" value={id} /><input type="hidden" name="id" value={r.id} />
                <SubmitButton className="btn sm danger" pendingText="…" confirm="Remover esta regra?">Remover</SubmitButton>
              </form>
            </div>
            <details className="sched"><summary className="btn sm">Editar</summary><RuleForm store={id} rule={r} city={cityName} /></details>
          </div>
        ))}
      </div>

      <details className="card" open={!rules.length}>
        <summary><b>+ Nova regra de frete</b></summary>
        <RuleForm store={id} city={cityName} />
      </details>
    </>
  );
}
