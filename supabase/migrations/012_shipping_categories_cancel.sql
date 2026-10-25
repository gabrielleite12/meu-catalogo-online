-- Fretes por região, tipo/modelo nos produtos, pedido aprovado e cancelamento com histórico (quem, quando, por quê).

-- 1) Produtos: tipo/modelo (ex.: categoria "Calçados" → tipo "Tênis")
alter table public.products add column if not exists subcategory text;
create index if not exists products_subcategory_idx on public.products(store_id, category, subcategory);

-- 2) Fretes
alter table public.stores add column if not exists shipping_add_to_total boolean not null default true; -- false = só informa o frete, não soma
alter table public.stores add column if not exists pickup_enabled boolean not null default false;       -- aceita retirada na loja (sem frete)

create table if not exists public.shipping_rules (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  scope text not null check (scope in ('city', 'state', 'other')),   -- cidade, estado inteiro ou demais locais
  city text,
  state text,
  mode text not null default 'pago' check (mode in ('pago', 'gratis', 'combinar', 'nao_entrega')),
  fee numeric(10,2) check (fee is null or fee >= 0),
  free_above numeric(12,2) check (free_above is null or free_above > 0), -- frete grátis a partir deste valor em produtos
  note text,                                                            -- ex.: "prazo de 2 dias úteis"
  position integer not null default 0,
  created_at timestamptz not null default now(),
  check (scope <> 'city' or nullif(trim(city), '') is not null),
  check (scope <> 'state' or nullif(trim(state), '') is not null),
  check (mode <> 'pago' or fee is not null)
);
create index if not exists shipping_rules_store_idx on public.shipping_rules(store_id, position);
alter table public.shipping_rules enable row level security;
drop policy if exists "frete: todos leem de loja publicada" on public.shipping_rules;
create policy "frete: todos leem de loja publicada" on public.shipping_rules for select using (
  exists (select 1 from public.stores s where s.id = store_id and (s.published or s.owner_id = auth.uid())));
drop policy if exists "frete: dono grava" on public.shipping_rules;
create policy "frete: dono grava" on public.shipping_rules for all
  using (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()))
  with check (exists (select 1 from public.stores s where s.id = store_id and s.owner_id = auth.uid()));

-- 3) Pedidos: frete, aprovação e cancelamento
alter table public.orders add column if not exists subtotal numeric(12,2);
alter table public.orders add column if not exists shipping_fee numeric(10,2);
alter table public.orders add column if not exists shipping_label text;
alter table public.orders add column if not exists shipping_added boolean not null default false; -- true = o frete está dentro do total
alter table public.orders add column if not exists delivery_type text not null default 'entrega';
alter table public.orders drop constraint if exists orders_delivery_type_check;
alter table public.orders add constraint orders_delivery_type_check check (delivery_type in ('entrega', 'retirada'));
alter table public.orders add column if not exists approved_at timestamptz;
alter table public.orders add column if not exists canceled_at timestamptz;
alter table public.orders add column if not exists canceled_by text;
alter table public.orders drop constraint if exists orders_canceled_by_check;
alter table public.orders add constraint orders_canceled_by_check check (canceled_by is null or canceled_by in ('cliente', 'loja'));
alter table public.orders add column if not exists cancel_reason text;

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('novo', 'aprovado', 'enviado', 'finalizado', 'cancelado', 'devolvido'));

-- 4) Cálculo do frete (usado pelo place_order; o carrinho mostra a mesma conta antes de enviar)
create or replace function public.shipping_quote(p_store uuid, p_city text, p_state text, p_subtotal numeric)
returns jsonb language plpgsql stable security definer set search_path = public, extensions as $$
declare r public.shipping_rules%rowtype;
  c text := lower(unaccent(trim(coalesce(p_city, ''))));
  s text := upper(trim(coalesce(p_state, '')));
begin
  -- a regra mais específica vence: cidade+UF, cidade, estado, demais locais
  select * into r from public.shipping_rules
   where store_id = p_store and (
     (scope = 'city' and lower(unaccent(trim(city))) = c and (nullif(trim(state), '') is null or upper(trim(state)) = s))
     or (scope = 'state' and upper(trim(state)) = s)
     or scope = 'other')
   order by case scope when 'city' then (case when nullif(trim(state), '') is null then 3 else 4 end) when 'state' then 2 else 1 end desc,
            position, created_at
   limit 1;
  if not found then
    return jsonb_build_object('mode', 'combinar', 'fee', null, 'label', 'Frete a combinar com a loja', 'note', null);
  end if;
  if r.mode = 'nao_entrega' then
    return jsonb_build_object('mode', 'nao_entrega', 'fee', null, 'label', 'A loja não entrega neste endereço', 'note', r.note);
  elsif r.mode = 'combinar' then
    return jsonb_build_object('mode', 'combinar', 'fee', null, 'label', 'Frete a combinar com a loja', 'note', r.note);
  elsif r.mode = 'gratis' or (r.free_above is not null and coalesce(p_subtotal, 0) >= r.free_above) then
    return jsonb_build_object('mode', 'gratis', 'fee', 0, 'label', 'Frete grátis', 'note', r.note);
  end if;
  return jsonb_build_object('mode', 'pago', 'fee', r.fee, 'label', 'Frete', 'note', r.note);
end $$;
revoke all on function public.shipping_quote(uuid, text, text, numeric) from public, anon, authenticated;

-- 5) place_order com frete (ou retirada na loja). Substitui a versão de 3 parâmetros.
drop function if exists public.place_order(uuid, jsonb, text);
create or replace function public.place_order(p_store uuid, p_items jsonb, p_notes text default null, p_pickup boolean default false)
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

  addr := concat_ws(' - ', prof.street || ', ' || prof.number, nullif(prof.complement, ''), nullif(prof.district, ''),
                    prof.city || '/' || prof.state, nullif(prof.zip, ''));

  insert into public.orders (store_id, customer_id, customer_name, customer_phone, customer_address, notes, stock_reserved)
  values (p_store, uid, prof.name, prof.phone, addr, left(nullif(trim(coalesce(p_notes, '')), ''), 500), true)
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
    'whatsapp', st.whatsapp, 'store_name', st.name, 'notes', left(nullif(trim(coalesce(p_notes, '')), ''), 500));
end $$;
revoke all on function public.place_order(uuid, jsonb, text, boolean) from public, anon;
grant execute on function public.place_order(uuid, jsonb, text, boolean) to authenticated;

-- 6) Aprovar o pedido (dono): confirma que vai atender. O estoque já está reservado desde o pedido.
create or replace function public.approve_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER'; end if;
  if not exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  if o.status <> 'novo' then raise exception 'STATUS'; end if;
  update public.orders set status = 'aprovado', approved_at = now() where id = p_order;
end $$;
revoke all on function public.approve_order(uuid) from public, anon;
grant execute on function public.approve_order(uuid) to authenticated;

-- 7) Enviar / entregar / agendar passam a aceitar o pedido aprovado
create or replace function public.ship_order(p_order uuid, p_date date default null, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER'; end if;
  if not exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  if o.status not in ('novo', 'aprovado') then raise exception 'STATUS'; end if;
  perform public.take_legacy_stock(o);
  update public.orders set status = 'enviado', shipped_at = now(),
    delivery_date = coalesce(p_date, delivery_date),
    delivery_note = coalesce(left(nullif(trim(coalesce(p_note, '')), ''), 200), delivery_note)
  where id = p_order;
end $$;

create or replace function public.deliver_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; is_owner boolean;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER'; end if;
  is_owner := exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid());
  if not (is_owner or o.customer_id = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if not (o.status = 'enviado' or (is_owner and o.status in ('novo', 'aprovado'))) then raise exception 'STATUS'; end if;
  perform public.take_legacy_stock(o);
  update public.orders set status = 'finalizado', finished_at = now() where id = p_order;
end $$;

create or replace function public.schedule_delivery(p_order uuid, p_date date, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER'; end if;
  if not exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  if o.status not in ('novo', 'aprovado', 'enviado') then raise exception 'STATUS'; end if;
  update public.orders set delivery_date = p_date,
    delivery_note = left(nullif(trim(coalesce(p_note, '')), ''), 200)
  where id = p_order;
end $$;

-- 8) Cancelar com registro de quem cancelou e do motivo; sempre devolve o estoque reservado.
--    Cliente cancela só pedido novo; a loja cancela novo, aprovado ou em trânsito (ex.: entrega que não aconteceu).
drop function if exists public.cancel_order(uuid);
create or replace function public.cancel_order(p_order uuid, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; it record; is_owner boolean;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER'; end if;
  is_owner := exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid());
  if not (is_owner or o.customer_id = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if not (o.status = 'novo' or (is_owner and o.status in ('aprovado', 'enviado'))) then raise exception 'STATUS'; end if;

  if o.stock_reserved then
    for it in select * from public.order_items where order_id = p_order loop
      if it.variant_id is not null then
        update public.product_variants set stock = stock + (it.qty - it.qty_returned) where id = it.variant_id and stock is not null;
      elsif it.product_id is not null then
        update public.products set stock = coalesce(stock, 0) + (it.qty - it.qty_returned) where id = it.product_id and track_stock;
      end if;
    end loop;
  end if;
  update public.orders set status = 'cancelado', canceled_at = now(),
    canceled_by = case when is_owner then 'loja' else 'cliente' end,
    cancel_reason = left(nullif(trim(coalesce(p_reason, '')), ''), 300)
  where id = p_order;
end $$;
revoke all on function public.cancel_order(uuid, text) from public, anon;
grant execute on function public.cancel_order(uuid, text) to authenticated;
