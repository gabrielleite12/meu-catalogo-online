-- Meu Catálogo Online — schema inicial
create extension if not exists pg_trgm;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text not null unique check (slug ~ '^[a-z0-9-]{3,40}$'),
  name text not null,
  description text,
  category text,                       -- tipo de produto (ex.: "Roupas", "Doces")
  whatsapp text,                       -- só dígitos com DDI, ex.: 5511999999999
  city text,
  payment_methods text[] not null default '{}',
  delivery_methods text[] not null default '{}',
  drive_folder_id text,
  published boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index stores_one_per_owner on public.stores(owner_id);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2),                 -- opcional
  track_stock boolean not null default false,
  stock integer,                       -- usado só se track_stock = true
  active boolean not null default true,
  position integer not null default 0,
  created_at timestamptz not null default now()
);
create index products_store_idx on public.products(store_id, position);

create table public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  drive_file_id text not null,
  position integer not null default 0
);
create index product_images_product_idx on public.product_images(product_id, position);
create index product_images_file_idx on public.product_images(drive_file_id);

-- Refresh token do Google: acessível só pelo service role (RLS sem policies)
create table public.drive_tokens (
  user_id uuid primary key references auth.users(id) on delete cascade,
  refresh_token text not null,
  updated_at timestamptz not null default now()
);

alter table public.stores enable row level security;
alter table public.products enable row level security;
alter table public.product_images enable row level security;
alter table public.drive_tokens enable row level security;

create policy "stores: leitura pública" on public.stores
  for select using (published or owner_id = auth.uid());
create policy "stores: dono escreve" on public.stores
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "products: leitura" on public.products
  for select using (
    exists (select 1 from public.stores s where s.id = store_id and (s.published or s.owner_id = auth.uid()))
  );
create policy "products: dono escreve" on public.products
  for all using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

create policy "images: leitura" on public.product_images
  for select using (
    exists (select 1 from public.products p join public.stores s on s.id = p.store_id
            where p.id = product_id and (s.published or s.owner_id = auth.uid()))
  );
create policy "images: dono escreve" on public.product_images
  for all using (
    exists (select 1 from public.products p join public.stores s on s.id = p.store_id
            where p.id = product_id and s.owner_id = auth.uid()))
  with check (
    exists (select 1 from public.products p join public.stores s on s.id = p.store_id
            where p.id = product_id and s.owner_id = auth.uid()));

-- Busca por nome da loja, tipo de produto ou nome de produto
create or replace function public.search_stores(q text)
returns setof public.stores
language sql stable security invoker as $$
  select s.* from public.stores s
  where s.published
    and (
      coalesce(q, '') = ''
      or s.name ilike '%' || q || '%'
      or s.category ilike '%' || q || '%'
      or s.city ilike '%' || q || '%'
      or exists (select 1 from public.products p
                 where p.store_id = s.id and p.active and p.name ilike '%' || q || '%')
    )
  order by s.created_at desc
  limit 60;
$$;

