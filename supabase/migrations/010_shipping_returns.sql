-- Em trânsito, entrega confirmada pelo cliente e devolução por item.
-- 'finalizado' passa a significar ENTREGUE (assim as avaliações continuam liberadas só depois da entrega).
-- O estoque continua reservado ao pedir; cancelar ou devolver (com reposição) devolve as unidades.

alter table public.orders drop constraint if exists orders_status_check;
alter table public.orders add constraint orders_status_check
  check (status in ('novo', 'enviado', 'finalizado', 'cancelado', 'devolvido'));
alter table public.orders add column if not exists shipped_at timestamptz;

alter table public.order_items add column if not exists qty_returned integer not null default 0;
alter table public.order_items drop constraint if exists order_items_qty_returned_check;
alter table public.order_items add constraint order_items_qty_returned_check check (qty_returned between 0 and qty);

create index if not exists orders_shipped_idx on public.orders(shipped_at) where status = 'enviado';

-- Histórico de devoluções
create table if not exists public.order_returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  order_item_id uuid not null references public.order_items(id) on delete cascade,
  qty integer not null check (qty > 0),
  restocked boolean not null,
  reason text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);
create index if not exists order_returns_order_idx on public.order_returns(order_id);
alter table public.order_returns enable row level security;
drop policy if exists "returns: cliente e dono leem" on public.order_returns;
create policy "returns: cliente e dono leem" on public.order_returns for select using (
  exists (select 1 from public.orders o where o.id = order_id and (
    o.customer_id = auth.uid()
    or exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid()))));

-- Pedidos antigos (sem reserva) baixam o estoque na primeira saída (envio ou entrega).
create or replace function public.take_legacy_stock(o public.orders) returns void
language plpgsql security definer set search_path = public as $$
declare it record;
begin
  if o.stock_reserved then return; end if;
  for it in select * from public.order_items where order_id = o.id loop
    if it.variant_id is not null then
      update public.product_variants set stock = greatest(0, stock - it.qty) where id = it.variant_id and stock is not null;
    elsif it.product_id is not null then
      update public.products set stock = greatest(0, coalesce(stock, 0) - it.qty) where id = it.product_id and track_stock;
    end if;
  end loop;
  update public.orders set stock_reserved = true where id = o.id;
end $$;
revoke all on function public.take_legacy_stock(public.orders) from public, anon, authenticated;

-- Dono: o pedido saiu para entrega (estoque "em trânsito")
create or replace function public.ship_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER'; end if;
  if not exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  if o.status <> 'novo' then raise exception 'STATUS'; end if;
  perform public.take_legacy_stock(o);
  update public.orders set status = 'enviado', shipped_at = now() where id = p_order;
end $$;

-- Entrega: o cliente confirma o recebimento (pedido enviado); o dono também pode registrar (inclusive retirada na loja).
create or replace function public.deliver_order(p_order uuid) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; is_owner boolean;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER'; end if;
  is_owner := exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid());
  if not (is_owner or o.customer_id = auth.uid()) then raise exception 'FORBIDDEN'; end if;
  if not (o.status = 'enviado' or (is_owner and o.status = 'novo')) then raise exception 'STATUS'; end if;
  perform public.take_legacy_stock(o);
  update public.orders set status = 'finalizado', finished_at = now() where id = p_order;
end $$;

-- Baixa automática: pedido enviado e não confirmado há 7 dias vira entregue.
create or replace function public.auto_deliver_orders() returns integer
language plpgsql security definer set search_path = public as $$
declare n integer;
begin
  update public.orders set status = 'finalizado', finished_at = now()
    where status = 'enviado' and shipped_at < now() - interval '7 days';
  get diagnostics n = row_count;
  return n;
end $$;

-- Dono: devolução de itens. p_returns = [{"item": uuid, "qty": n, "restock": bool}], restock=false descarta a unidade.
create or replace function public.return_items(p_order uuid, p_returns jsonb, p_reason text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype; r jsonb; it public.order_items%rowtype; q int; rs boolean; reason text;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER'; end if;
  if not exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  if o.status not in ('enviado', 'finalizado') then raise exception 'STATUS'; end if;
  if p_returns is null or jsonb_typeof(p_returns) <> 'array' or jsonb_array_length(p_returns) = 0 then
    raise exception 'EMPTY';
  end if;
  reason := left(nullif(trim(coalesce(p_reason, '')), ''), 300);

  for r in select * from jsonb_array_elements(p_returns) loop
    q := coalesce((r->>'qty')::int, 0);
    if q <= 0 then continue; end if;
    rs := coalesce((r->>'restock')::boolean, true);
    select * into it from public.order_items where id = (r->>'item')::uuid and order_id = p_order for update;
    if not found then raise exception 'ITEM'; end if;
    if q > it.qty - it.qty_returned then raise exception 'QTY|%', it.name; end if;

    update public.order_items set qty_returned = qty_returned + q where id = it.id;
    if rs then
      if it.variant_id is not null then
        update public.product_variants set stock = stock + q where id = it.variant_id and stock is not null;
      elsif it.product_id is not null then
        update public.products set stock = coalesce(stock, 0) + q where id = it.product_id and track_stock;
      end if;
    end if;
    insert into public.order_returns (order_id, order_item_id, qty, restocked, reason, created_by)
      values (p_order, it.id, q, rs, reason, auth.uid());
  end loop;

  if not exists (select 1 from public.order_items where order_id = p_order and qty_returned < qty) then
    update public.orders set status = 'devolvido' where id = p_order;
  end if;
end $$;

drop function if exists public.finalize_order(uuid);

revoke all on function public.ship_order(uuid), public.deliver_order(uuid), public.auto_deliver_orders(),
  public.return_items(uuid, jsonb, text) from public, anon;
grant execute on function public.ship_order(uuid), public.deliver_order(uuid), public.auto_deliver_orders(),
  public.return_items(uuid, jsonb, text) to authenticated;
