-- 1) Endurecimento: pedidos só mudam pelas funções do banco (place_order, ship_order, deliver_order, cancel_order, return_items).
--    Antes, qualquer cliente podia inserir pedido/itens com preço inventado e o dono podia mudar status/total direto, pulando o estoque.
drop policy if exists "orders: cliente cria" on public.orders;
drop policy if exists "items: cliente cria no pedido novo" on public.order_items;
drop policy if exists "orders: dono atualiza" on public.orders;
revoke insert, update, delete on public.orders, public.order_items from anon, authenticated;
-- avaliações: o cliente só pode editar nota e comentário (não mover para outra loja/pedido)
revoke update on public.store_reviews, public.product_reviews from anon, authenticated;
grant update (rating, comment) on public.store_reviews, public.product_reviews to authenticated;

-- 2) Entrega agendada
alter table public.orders add column if not exists delivery_date date;
alter table public.orders add column if not exists delivery_note text;

drop function if exists public.ship_order(uuid);
create or replace function public.ship_order(p_order uuid, p_date date default null, p_note text default null) returns void
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
  update public.orders set status = 'enviado', shipped_at = now(),
    delivery_date = coalesce(p_date, delivery_date),
    delivery_note = coalesce(left(nullif(trim(coalesce(p_note, '')), ''), 200), delivery_note)
  where id = p_order;
end $$;

-- Dono: combina/altera o dia (e a janela) da entrega, em pedido novo ou em trânsito
create or replace function public.schedule_delivery(p_order uuid, p_date date, p_note text default null) returns void
language plpgsql security definer set search_path = public as $$
declare o public.orders%rowtype;
begin
  select * into o from public.orders where id = p_order for update;
  if not found then raise exception 'ORDER'; end if;
  if not exists (select 1 from public.stores s where s.id = o.store_id and s.owner_id = auth.uid()) then
    raise exception 'FORBIDDEN';
  end if;
  if o.status not in ('novo', 'enviado') then raise exception 'STATUS'; end if;
  update public.orders set delivery_date = p_date,
    delivery_note = left(nullif(trim(coalesce(p_note, '')), ''), 200)
  where id = p_order;
end $$;

revoke all on function public.ship_order(uuid, date, text), public.schedule_delivery(uuid, date, text) from public, anon;
grant execute on function public.ship_order(uuid, date, text), public.schedule_delivery(uuid, date, text) to authenticated;

-- 3) Avisos push (PWA). Só o servidor (service role) lê e grava; o cliente não acessa a tabela direto.
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);
alter table public.push_subscriptions enable row level security;
revoke all on public.push_subscriptions from anon, authenticated;
