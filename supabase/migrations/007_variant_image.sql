-- Foto própria por variação (ex.: a foto da camisa vermelha). Referencia o arquivo do Drive de uma foto do produto.
alter table public.product_variants add column if not exists image_file_id text;
