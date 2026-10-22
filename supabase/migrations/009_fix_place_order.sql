-- Corrige ambiguidade da variável 'total' em place_order
create or replace function public.place_order(p_store uuid, p_items jsonb, p_notes text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  prof public.profiles%rowtype;
  st public.stores%rowtype;
  it jsonb; pr public.products%rowtype; vr public.product_variants%rowtype;
  qty int; price numeric; v_total numeric := 0; v_name text; has_vars boolean;
  oid uuid; ocode int; addr text; lines jsonb := '[]'::jsonb;
begin
  if uid is null then raise exception 'AUTH'; end if;
  select * into prof from public.profiles where id = uid;
  if not found then raise exception 'PROFILE'; end if;
  select * into st from public.stores where id = p_store and published;
  if not found then raise exception 'STORE'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'EMPTY';
  end if;

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

  update public.orders set total = nullif(v_total, 0) where id = oid;
  return jsonb_build_object('order_id', oid, 'code', ocode, 'total', v_total, 'lines', lines,
    'customer_name', prof.name, 'customer_phone', prof.phone, 'address', addr,
    'whatsapp', st.whatsapp, 'store_name', st.name, 'notes', left(nullif(trim(coalesce(p_notes, '')), ''), 500));
end $$;

