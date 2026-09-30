create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value)
values
  ('hero_image_url', ''),
  ('hero_image_alt', 'Nuevos productos de Tuflitas')
on conflict (key) do nothing;