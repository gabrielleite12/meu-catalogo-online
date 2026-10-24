import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { CATEGORY_PRESETS } from "@/lib/categories";
import { renameLabel } from "../../actions";
import SubmitButton from "@/components/SubmitButton";

function Row({ store, kind, name, n }: { store: string; kind: "category" | "subcategory" | "tag"; name: string; n: number }) {
  return (
    <form action={renameLabel} className="tplrow">
      <input type="hidden" name="store" value={store} /><input type="hidden" name="kind" value={kind} /><input type="hidden" name="from" value={name} />
      <span><b>{name}</b> <span className="muted">{n} {n === 1 ? "produto" : "produtos"}</span></span>
      <input name="to" defaultValue={name} aria-label={`Novo nome de ${name}`} />
      <SubmitButton className="btn sm" pendingText="…">Renomear</SubmitButton>
    </form>
  );
}

const count = (xs: (string | null)[]) => { const m = new Map<string, number>(); xs.forEach((x) => x && m.set(x, (m.get(x) ?? 0) + 1)); return [...m].sort((a, b) => a[0].localeCompare(b[0], "pt-BR")); };

export default async function Categorias({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; erro?: string }> }) {
  const { id } = await params;
  const { ok, erro } = await searchParams;
  const supabase = await supabaseServer();
  const { data } = await supabase.from("products").select("category,subcategory,tags").eq("store_id", id);
  const ps = data ?? [];
  const cats = count(ps.map((p) => p.category));
  const types = count(ps.map((p) => p.subcategory));
  const tags = count(ps.flatMap((p) => (p.tags as string[]) ?? []));
  const without = ps.filter((p) => !p.category).length;

  return (
    <>
      <h2>Categorias</h2>
      <p className="muted">É o que o cliente usa para filtrar o catálogo. Cada produto tem uma <b>categoria</b> (ex.: Calçados), um <b>tipo/modelo</b> (ex.: Tênis) e <b>etiquetas</b> livres (ex.: Masculino, Nike). Aqui você renomeia ou junta tudo de uma vez: se o novo nome já existir, os produtos se juntam; deixando em branco, o nome é removido dos produtos.</p>
      {ok && <p className="ok">✓ {ok}</p>}
      {erro && <p className="err">{erro}</p>}
      {without > 0 && <p className="alert soft">{without} {without === 1 ? "produto está" : "produtos estão"} sem categoria — no catálogo eles não aparecem em nenhuma categoria. <Link href={`/painel/${id}/produtos`}>Ir para os produtos</Link></p>}

      <h3 className="sec">Categorias <span className="muted">({cats.length})</span></h3>
      {!cats.length && <p className="muted">Ainda não há categorias. Defina no cadastro do produto, ao importar fotos, ou selecione vários produtos e use "Definir categoria".</p>}
      <div className="stack">{cats.map(([c, n]) => <Row key={c} store={id} kind="category" name={c} n={n} />)}</div>

      <h3 className="sec">Tipos / modelos <span className="muted">({types.length})</span></h3>
      {!types.length && <p className="muted">Nenhum tipo definido (ex.: Tênis, Camiseta, Vestido).</p>}
      <div className="stack">{types.map(([c, n]) => <Row key={c} store={id} kind="subcategory" name={c} n={n} />)}</div>

      <h3 className="sec">Etiquetas <span className="muted">({tags.length})</span></h3>
      {!tags.length && <p className="muted">Nenhuma etiqueta (ex.: Masculino, Feminino, Marca).</p>}
      <div className="stack">{tags.map(([c, n]) => <Row key={c} store={id} kind="tag" name={c} n={n} />)}</div>

      <details className="card tplbox">
        <summary><b>Sugestões de categoria e tipo</b> <span className="muted">— ideias para organizar</span></summary>
        <p className="muted">No cadastro do produto, ao digitar a categoria e o tipo, aparecem estas sugestões (e as que você já usa). Você pode digitar qualquer outro nome.</p>
        {Object.entries(CATEGORY_PRESETS).map(([c, t]) => <p key={c}><b>{c}:</b> <span className="muted">{t.join(", ")}</span></p>)}
      </details>
    </>
  );
}
