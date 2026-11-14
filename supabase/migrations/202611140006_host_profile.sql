alter table public.ice_rooms add column if not exists host_profile_id uuid;

-- 팀장 선점과 프로필 등록을 같은 트랜잭션에서 수행한다.
create or replace function public.ice_claim_host_profile(p_room uuid, p_event_hash text, p_host_hash text,
  p_token_hash text, p_name text, p_occupation text, p_experience text, p_domains text[],
  p_introduction text, p_social_url text)
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare claimed_room uuid; profile_id uuid;
begin
  select id into claimed_room from public.ice_rooms
    where id = p_room and invite_hash = p_event_hash and team_number between 1 and 15
      and host_name is null for update;
  if not found then return null; end if;
  profile_id := public.ice_join_profile(p_room, p_token_hash, p_name, p_occupation,
    p_experience, p_domains, p_introduction, p_social_url);
  update public.ice_rooms set host_name = p_name, host_hash = p_host_hash, host_profile_id = profile_id
    where id = p_room;
  return profile_id;
end;
$$;
revoke all on function public.ice_claim_host_profile(uuid,text,text,text,text,text,text,text[],text,text) from public, anon, authenticated;
grant execute on function public.ice_claim_host_profile(uuid,text,text,text,text,text,text,text[],text,text) to service_role;
