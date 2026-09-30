alter table public.products
  add column if not exists discount_price_ars numeric(12, 2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'products_discount_price_check'
      and conrelid = 'public.products'::regclass
  ) then
    alter table public.products
      add constraint products_discount_price_check
      check (
        discount_price_ars is null
        or (discount_price_ars > 0 and discount_price_ars < price_ars)
      );
  end if;
end
$$;