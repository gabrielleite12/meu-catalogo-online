-- SKU e variações (tamanho, cor...) com estoque próprio

alter table public.products add column if not exists sku text;

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null,                 -- ex.: "M / Azul"
  sku text,
  price numeric(12,2),                -- vazio = usa o preço do produto
  stock integer,                      -- vazio = sem controle de estoque
  active boolean not null default true,
  position integer not null default 0
);
create index product_variants_product_idx on public.product_variants(product_id, position);
alter table public.product_variants enable row level security;

create policy "variants: leitura" on public.product_variants for select using (
  exists (select 1 from public.products p join public.stores s on s.id = p.store_id
          where p.id = product_id and (s.published or s.owner_id = auth.uid())));
create policy "variants: dono escreve" on public.product_variants for all
  using (exists (select 1 from public.products p join public.stores s on s.id = p.store_id
                 where p.id = product_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.products p join public.stores s on s.id = p.store_id
                      where p.id = product_id and s.owner_id = auth.uid()));

alter table public.order_items
  add column if not exists variant_id uuid references public.product_variants(id) on delete set null,
  add column if not exists variant_name text;
