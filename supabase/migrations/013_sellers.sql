-- 013_sellers.sql: Sistema de Vendedores da Loja e Vínculo com Pedidos

-- 1) Tabela de Vendedores
create table if not exists public.sellers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  code text,               -- Matrícula, código ou apelido do vendedor
  phone text,              -- WhatsApp do vendedor
  email text,
  active boolean not null default true,
  position int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists sellers_store_idx on public.sellers(store_id, active, position);

-- RLS
alter table public.sellers enable row level security;

drop policy if exists "sellers: dono da loja gerencia" on public.sellers;
create policy "sellers: dono da loja gerencia" on public.sellers
  for all using (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  )
  with check (
    exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid())
  );

drop policy if exists "sellers: leitura publica de vendedores ativos" on public.sellers;
create policy "sellers: leitura publica de vendedores ativos" on public.sellers
  for select using (
    active = true and exists (select 1 from public.stores s where s.id = store_id and s.published = true)
  );

-- 2) Vincular Vendedor aos Pedidos
alter table public.orders add column if not exists seller_id uuid references public.sellers(id) on delete set null;
alter table public.orders add column if not exists seller_name text;
create index if not exists orders_seller_idx on public.orders(seller_id);

-- 3) Atualiza place_order para suportar p_seller
create or replace function public.place_order(
  p_store uuid,
  p_items jsonb,
  p_notes text default null,
  p_pickup boolean default false,
  p_seller uuid default null
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prof public.profiles%rowtype;
  st public.stores%rowtype;
  it jsonb; pr public.products%rowtype; vr public.product_variants%rowtype;
  qty int; price numeric; v_total numeric := 0; v_name text; has_vars boolean;
  oid uuid; ocode int; addr text; lines jsonb := '[]'::jsonb;
  q jsonb; v_fee numeric := null; v_label text; v_added boolean := false; v_type text := 'entrega';
  v_seller_name text := null;
begin
  if uid is null then raise exception 'AUTH'; end if;
  select * into prof from public.profiles where id = uid;
  if not found then raise exception 'PROFILE'; end if;
  select * into st from public.stores where id = p_store and published;
  if not found then raise exception 'STORE'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'EMPTY';
  end if;
  if p_pickup and not st.pickup_enabled then raise exception 'PICKUP'; end if;

  -- Se foi indicado vendedor, confere se pertence à loja
  if p_seller is not null then
    select name into v_seller_name from public.sellers where id = p_seller and store_id = p_store;
  end if;

  addr := concat_ws(' - ', prof.street || ', ' || prof.number, nullif(prof.complement, ''), nullif(prof.district, ''),
                    prof.city || '/' || prof.state, nullif(prof.zip, ''));

  insert into public.orders (store_id, customer_id, customer_name, customer_phone, customer_address, notes, stock_reserved, seller_id, seller_name)
  values (p_store, uid, prof.name, prof.phone, addr, left(nullif(trim(coalesce(p_notes, '')), ''), 500), true, p_seller, v_seller_name)
  returning id, code into oid, ocode;

  for it in select * from jsonb_array_elements(p_items) loop
    qty := least(greatest(coalesce((it->>'qty')::int, 1), 1), 999);
    select * into pr from public.products
      where id = (it->>'id')::uuid and store_id = p_store and active for update;
    if not found then raise exception 'ITEM'; end if;
    select exists(select 1 from public.product_variants where product_id = pr.id and active) into has_vars;
    v_name := null;

    if has_vars then
      select * into vr from public.product_variants
        where id = nullif(it->>'variantId', '')::uuid and product_id = pr.id and active for update;
      if not found then raise exception 'VARIANT|%', pr.name; end if;
      if vr.stock is not null then
        if vr.stock < qty then raise exception 'STOCK|%', pr.name || ' · ' || vr.name; end if;
        update public.product_variants set stock = stock - qty where id = vr.id;
      end if;
      price := coalesce(vr.price, pr.price);
      v_name := vr.name;
      insert into public.order_items (order_id, product_id, variant_id, variant_name, name, price, qty)
        values (oid, pr.id, vr.id, vr.name, pr.name, price, qty);
    else
      if pr.track_stock then
        if coalesce(pr.stock, 0) < qty then raise exception 'STOCK|%', pr.name; end if;
        update public.products set stock = coalesce(stock, 0) - qty where id = pr.id;
      end if;
      price := pr.price;
      insert into public.order_items (order_id, product_id, name, price, qty) values (oid, pr.id, pr.name, price, qty);
    end if;

    v_total := v_total + coalesce(price, 0) * qty;
    lines := lines || jsonb_build_object('name', pr.name, 'variant', v_name, 'price', price, 'qty', qty);
  end loop;

  -- frete: retirada não paga frete; senão vale a regra da região do cliente
  if p_pickup then
    v_type := 'retirada'; v_label := 'Retirada na loja'; v_fee := 0;
  else
    q := public.shipping_quote(p_store, prof.city, prof.state, v_total);
    if q->>'mode' = 'nao_entrega' then raise exception 'NODELIVERY|%', prof.city; end if;
    v_label := q->>'label';
    v_fee := (q->>'fee')::numeric;
    if q->>'note' is not null then v_label := v_label || ' (' || (q->>'note') || ')'; end if;
  end if;
  v_added := st.shipping_add_to_total and coalesce(v_fee, 0) > 0;

  update public.orders set subtotal = nullif(v_total, 0), shipping_fee = v_fee, shipping_label = v_label,
    shipping_added = v_added, delivery_type = v_type,
    total = nullif(v_total + case when v_added then v_fee else 0 end, 0)
  where id = oid;

  return jsonb_build_object('order_id', oid, 'code', ocode,
    'total', v_total + case when v_added then v_fee else 0 end, 'subtotal', v_total, 'lines', lines,
    'shipping_fee', v_fee, 'shipping_label', v_label, 'shipping_added', v_added, 'delivery_type', v_type,
    'customer_name', prof.name, 'customer_phone', prof.phone, 'address', addr,
    'seller_name', v_seller_name,
    'whatsapp', st.whatsapp, 'store_name', st.name, 'notes', left(nullif(trim(coalesce(p_notes, '')), ''), 500));
end $$;

revoke all on function public.place_order(uuid, jsonb, text, boolean, uuid) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, boolean, uuid) to authenticated;
