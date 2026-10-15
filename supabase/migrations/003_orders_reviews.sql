-- Vários catálogos por conta, logo, cadastro de cliente, pedidos e avaliações

-- 1) Várias lojas por dono + logo
drop index if exists public.stores_one_per_owner;
alter table public.stores add column if not exists logo_url text;

-- 2) Bucket de logos (público para leitura, 1 MB, só imagens)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = 1048576, allowed_mime_types = array['image/png', 'image/jpeg', 'image/webp'];

create policy "logos: leitura pública" on storage.objects
  for select using (bucket_id = 'logos');
create policy "logos: dono envia na própria pasta" on storage.objects
  for insert to authenticated with check (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: dono atualiza" on storage.objects
  for update to authenticated using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "logos: dono apaga" on storage.objects
  for delete to authenticated using (bucket_id = 'logos' and (storage.foldername(name))[1] = auth.uid()::text);

-- 3) Cadastro do cliente
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  phone text not null,
  zip text, street text not null, number text not null, complement text,
  district text, city text not null, state text not null,
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
create policy "profiles: dono" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());

-- 4) Pedidos (com cópia dos dados do cliente e dos itens no momento da compra)
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  code serial,
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'novo' check (status in ('novo', 'finalizado', 'cancelado')),
  customer_name text not null,
  customer_phone text not null,
  customer_address text not null,
  notes text,
  total numeric(12,2),
  created_at timestamptz not null default now(),
  finished_at timestamptz
);
create index orders_store_idx on public.orders(store_id, created_at desc);
create index orders_customer_idx on public.orders(customer_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  name text not null,
  price numeric(12,2),
  qty integer not null check (qty > 0)
);
create index order_items_order_idx on public.order_items(order_id);

alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create policy "orders: cliente e dono leem" on public.orders for select using (
  customer_id = auth.uid()
  or exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));
create policy "orders: cliente cria" on public.orders for insert with check (
  customer_id = auth.uid() and status = 'novo');
create policy "orders: dono atualiza" on public.orders for update using (
  exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

create policy "items: cliente e dono leem" on public.order_items for select using (
  exists (select 1 from public.orders o where o.id = order_id and (
    o.customer_id = auth.uid()
    or exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid()))));
create policy "items: cliente cria no pedido novo" on public.order_items for insert with check (
  exists (select 1 from public.orders o where o.id = order_id and o.customer_id = auth.uid() and o.status = 'novo'));

-- 5) Avaliações: só de pedido finalizado do próprio cliente
create table public.store_reviews (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);
create table public.product_reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  order_item_id uuid not null unique references public.order_items(id) on delete cascade,
  customer_id uuid not null references auth.users(id) on delete cascade,
  reviewer_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  created_at timestamptz not null default now()
);
create index store_reviews_store_idx on public.store_reviews(store_id, created_at desc);
create index product_reviews_product_idx on public.product_reviews(product_id, created_at desc);

alter table public.store_reviews enable row level security;
alter table public.product_reviews enable row level security;

create policy "store_reviews: leitura pública" on public.store_reviews for select using (true);
create policy "store_reviews: cliente avalia pedido finalizado" on public.store_reviews for insert with check (
  customer_id = auth.uid() and exists (
    select 1 from public.orders o
    where o.id = order_id and o.customer_id = auth.uid() and o.status = 'finalizado' and o.store_id = store_reviews.store_id));
create policy "store_reviews: cliente edita a sua" on public.store_reviews for update using (customer_id = auth.uid());

create policy "product_reviews: leitura pública" on public.product_reviews for select using (true);
create policy "product_reviews: cliente avalia item finalizado" on public.product_reviews for insert with check (
  customer_id = auth.uid() and exists (
    select 1 from public.order_items oi join public.orders o on o.id = oi.order_id
    where oi.id = order_item_id and o.customer_id = auth.uid() and o.status = 'finalizado'
      and oi.product_id = product_reviews.product_id));
create policy "product_reviews: cliente edita a sua" on public.product_reviews for update using (customer_id = auth.uid());

-- 6) Médias públicas
create view public.store_rating_stats as
  select store_id, round(avg(rating)::numeric, 1) as avg_rating, count(*)::int as total
  from public.store_reviews group by store_id;
create view public.product_rating_stats as
  select product_id, round(avg(rating)::numeric, 1) as avg_rating, count(*)::int as total
  from public.product_reviews group by product_id;
grant select on public.store_rating_stats, public.product_rating_stats to anon, authenticated;
