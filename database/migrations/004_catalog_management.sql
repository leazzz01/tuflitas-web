alter table public.products
  add column if not exists display_order integer not null default 0;

alter table public.product_variants
  add column if not exists is_active boolean not null default true;

with ranked_products as (
  select
    id,
    row_number() over (
      order by is_new desc, is_featured desc, created_at desc, name asc
    ) - 1 as position
  from public.products
)
update public.products as product
set display_order = ranked_products.position
from ranked_products
where product.id = ranked_products.id;

create index if not exists products_active_order_idx
  on public.products (is_active, display_order, created_at desc);

create index if not exists product_variants_active_idx
  on public.product_variants (product_id, is_active);