create table if not exists public.ice_admin_attempts (
  ip_hash text primary key,
  window_started_at timestamptz not null default now(),
  attempts integer not null default 0
);
alter table public.ice_admin_attempts enable row level security;
revoke all on public.ice_admin_attempts from public, anon, authenticated;
grant all on public.ice_admin_attempts to service_role;

create or replace function public.ice_admin_attempt(p_ip_hash text)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare n integer;
begin
  insert into public.ice_admin_attempts(ip_hash, window_started_at, attempts) values(p_ip_hash, now(), 1)
  on conflict (ip_hash) do update set
    attempts = case when ice_admin_attempts.window_started_at <= now() - interval '1 minute' then 1 else ice_admin_attempts.attempts + 1 end,
    window_started_at = case when ice_admin_attempts.window_started_at <= now() - interval '1 minute' then now() else ice_admin_attempts.window_started_at end
  returning attempts into n;
  return n <= 5;
end;
$$;
revoke all on function public.ice_admin_attempt(text) from public, anon, authenticated;
grant execute on function public.ice_admin_attempt(text) to service_role;
