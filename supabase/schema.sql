create table if not exists public.convert_counter (
  id integer primary key default 1 check (id = 1),
  count bigint not null default 0,
  updated_at timestamptz not null default now()
);

insert into public.convert_counter (id, count)
values (1, 0)
on conflict (id) do nothing;

alter table public.convert_counter enable row level security;

drop policy if exists "Allow anon read convert counter" on public.convert_counter;
create policy "Allow anon read convert counter"
  on public.convert_counter
  for select
  to anon, authenticated
  using (id = 1);

drop function if exists public.increment_convert_count();
create or replace function public.increment_convert_count()
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  next_count bigint;
begin
  update public.convert_counter
  set count = count + 1,
      updated_at = now()
  where id = 1
  returning count into next_count;

  return next_count;
end;
$$;

revoke all on public.convert_counter from anon, authenticated;
grant select on public.convert_counter to anon, authenticated;

revoke all on function public.increment_convert_count() from public;
grant execute on function public.increment_convert_count() to anon, authenticated;
