-- Busca sem diferenciar acentos ("tenis" encontra "Tênis")
create extension if not exists unaccent with schema extensions;

create or replace function public.search_stores(q text)
returns setof public.stores
language sql stable security invoker set search_path = public, extensions as $$
  select s.* from public.stores s
  where s.published
    and (
      coalesce(q, '') = ''
      or unaccent(s.name) ilike '%' || unaccent(q) || '%'
      or unaccent(coalesce(s.category, '')) ilike '%' || unaccent(q) || '%'
      or unaccent(coalesce(s.city, '')) ilike '%' || unaccent(q) || '%'
      or exists (select 1 from public.products p
                 where p.store_id = s.id and p.active and unaccent(p.name) ilike '%' || unaccent(q) || '%')
    )
  order by s.created_at desc
  limit 60;
$$;
