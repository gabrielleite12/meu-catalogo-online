-- Categorias, tags, código de barras, alerta de estoque, ocultar sem estoque e modelos de variação

alter table public.products
  add column if not exists category text,                       -- categoria principal (texto livre)
  add column if not exists tags text[] not null default '{}',   -- subcategorias: masculino, feminino, tipo, marca, cor...
  add column if not exists barcode text,
  add column if not exists low_stock_alert integer,             -- avisa quando o estoque for <= este valor
  add column if not exists hide_when_out boolean not null default true,  -- oculta sozinho ao zerar o estoque
  add column if not exists auto_hidden boolean not null default false;   -- marca que foi oculto automaticamente
create index if not exists products_category_idx on public.products(store_id, category);

alter table public.product_variants add column if not exists barcode text;

-- Modelos de variação: store_id nulo = global (todas as lojas)
create table public.variation_templates (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  name text not null,
  options text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.variation_templates enable row level security;
create policy "templates: leitura" on public.variation_templates for select using (
  store_id is null or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "templates: dono escreve" on public.variation_templates for all
  using (store_id is not null and exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (store_id is not null and exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

insert into public.variation_templates (store_id, name, options) values
  (null, 'Tamanho', array['PP','P','M','G','GG','XG']),
  (null, 'Numeração (calçados)', array['34','35','36','37','38','39','40','41','42','43','44']),
  (null, 'Cor', array['Preto','Branco','Cinza','Azul','Vermelho','Verde','Amarelo','Rosa','Marrom','Bege']),
  (null, 'Gênero', array['Masculino','Feminino','Unissex','Infantil']);

-- Oculta o produto quando o estoque acaba e reexibe quando volta (só se foi oculto automaticamente)
create or replace function public.sync_product_availability(pid uuid) returns void
language plpgsql as $$
declare
  p public.products%rowtype;
  n_vars int; n_unlimited int; qty bigint; tracked boolean; available boolean;
begin
  select * into p from public.products where id = pid;
  if not found then return; end if;

  select count(*), count(*) filter (where stock is null), coalesce(sum(stock), 0)
    into n_vars, n_unlimited, qty
    from public.product_variants where product_id = pid and active;

  if n_vars > 0 then
    tracked := n_unlimited = 0;              -- todas as variações com estoque controlado
    available := not tracked or qty > 0;
  else
    tracked := p.track_stock;
    available := not tracked or coalesce(p.stock, 0) > 0;
  end if;

  if p.hide_when_out and not available and p.active then
    update public.products set active = false, auto_hidden = true where id = pid;
  elsif available and p.auto_hidden and not p.active then
    update public.products set active = true, auto_hidden = false where id = pid;
  end if;
end $$;

create or replace function public.trg_products_stock() returns trigger
language plpgsql as $$
begin
  perform public.sync_product_availability(new.id);
  return null;
end $$;
create trigger products_stock_sync after insert or update of stock, track_stock, hide_when_out
  on public.products for each row execute function public.trg_products_stock();

create or replace function public.trg_variants_stock() returns trigger
language plpgsql as $$
begin
  perform public.sync_product_availability(coalesce(new.product_id, old.product_id));
  return null;
end $$;
create trigger variants_stock_sync after insert or update or delete
  on public.product_variants for each row execute function public.trg_variants_stock();
