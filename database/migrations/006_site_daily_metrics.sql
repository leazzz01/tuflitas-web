create table if not exists public.site_daily_metrics (
  metric_date date primary key default current_date,
  page_visits integer not null default 0 check (page_visits >= 0)
);