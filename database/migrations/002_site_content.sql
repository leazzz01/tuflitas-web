create table if not exists public.site_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (key, value)
values
  ('announcement_primary', 'Temporada de hogar · Salta Capital'),
  ('announcement_secondary', 'Venta minorista · Entregas a coordinar'),
  ('hero_eyebrow', 'Artículos de temporada'),
  ('hero_title_lead', 'Qué lindo es llegar'),
  ('hero_title_emphasis', 'a casa.'),
  ('hero_description', 'Pantuflas, pijamas y cositas hermosas para disfrutar tus momentos de pausa.'),
  ('hero_cta', 'Mirá los ingresos'),
  ('hero_footer', 'SALTA CAPITAL · ENTREGAS A COORDINAR'),
  ('welcome_eyebrow', 'Hola, qué bueno que llegaste'),
  ('welcome_title', '¡Te damos la bienvenida a Tuflitas!'),
  ('welcome_description', 'Somos un emprendimiento de Salta Capital con pantuflas, pijamas y artículos de temporada.'),
  ('welcome_fact_1_title', 'Venta minorista'),
  ('welcome_fact_1_text', 'Elegí tus favoritos con calma.'),
  ('welcome_fact_2_title', 'Entregas a coordinar'),
  ('welcome_fact_2_text', 'Consultanos por WhatsApp.'),
  ('catalog_eyebrow', 'Ingresos de temporada'),
  ('catalog_title', 'Encontrá tu próximo favorito'),
  ('catalog_note', 'Venta minorista · Salta Capital'),
  ('catalog_disclaimer', 'Consultá disponibilidad y entregas por WhatsApp.')
on conflict (key) do nothing;