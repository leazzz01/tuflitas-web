create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.categories (name, slug, sort_order)
values
  ('Pantuflas', 'pantuflas', 1),
  ('Pijamas', 'pijamas', 2),
  ('Extras', 'extras', 3)
on conflict (slug) do nothing;

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories (id),
  name text not null,
  slug text not null unique,
  description text not null default '',
  price_ars numeric(12, 2) not null check (price_ars >= 0),
  is_active boolean not null default true,
  is_featured boolean not null default false,
  is_new boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_catalog_idx
  on public.products (is_active, category_id, created_at desc);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  sku text unique,
  size_label text not null,
  color_name text not null default 'Único',
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  created_at timestamptz not null default now(),
  unique (product_id, size_label, color_name)
);

create index if not exists product_variants_product_idx
  on public.product_variants (product_id);

create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  sort_order integer not null default 0,
  is_cover boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists product_images_product_idx
  on public.product_images (product_id, sort_order);

create unique index if not exists product_images_one_cover_idx
  on public.product_images (product_id)
  where is_cover = true;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants (id),
  movement_type text not null check (
    movement_type in ('entry', 'sale', 'return', 'adjustment')
  ),
  quantity_delta integer not null check (quantity_delta <> 0),
  check (
    (movement_type in ('entry', 'return') and quantity_delta > 0)
    or (movement_type = 'sale' and quantity_delta < 0)
    or movement_type = 'adjustment'
  ),
  note text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists stock_movements_variant_date_idx
  on public.stock_movements (variant_id, created_at desc);

create table if not exists public.product_daily_metrics (
  product_id uuid not null references public.products (id) on delete cascade,
  metric_date date not null default current_date,
  views integer not null default 0 check (views >= 0),
  cart_additions integer not null default 0 check (cart_additions >= 0),
  primary key (product_id, metric_date)
);

create index if not exists product_daily_metrics_views_idx
  on public.product_daily_metrics (metric_date desc, views desc);