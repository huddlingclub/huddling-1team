-- 플로우 v2: 기존 데이터와 투표 테이블을 보존합니다.
alter table public.ice_rooms add column if not exists team_number integer;
alter table public.ice_rooms add column if not exists topic_window_started_at timestamptz;
alter table public.ice_rooms add column if not exists topic_attempts integer not null default 0;
create unique index if not exists ice_team_per_event on public.ice_rooms(invite_hash, team_number) where team_number is not null;

create or replace function public.ice_join_profile(p_room uuid, p_token_hash text, p_name text, p_occupation text,
  p_experience text, p_domains text[], p_introduction text, p_social_url text)
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare room_id_value uuid; profile_id uuid;
begin
  select id into room_id_value from public.ice_rooms where id = p_room for update;
  if room_id_value is null then raise exception 'room_not_found'; end if;
  if (select count(*) from public.ice_profiles where room_id = p_room) >= 30 then raise exception 'room_full'; end if;
  insert into public.ice_profiles(room_id, token_hash, name, occupation, experience, domains, introduction, social_url)
    values(p_room, p_token_hash, p_name, p_occupation, p_experience, p_domains, p_introduction, p_social_url)
    returning id into profile_id;
  return profile_id;
end;
$$;

create or replace function public.ice_begin_questions(p_room uuid)
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare r public.ice_rooms%rowtype; g uuid := gen_random_uuid();
begin
  select * into r from public.ice_rooms where id = p_room for update;
  if not found or not exists(select 1 from public.ice_profiles where room_id = p_room) then return null; end if;
  if r.phase = 'generating' and r.generation_started_at > now() - interval '1 minute' then return null; end if;
  if r.topic_window_started_at is not null and r.topic_window_started_at > now() - interval '1 hour' and r.topic_attempts >= 10 then return null; end if;
  update public.ice_rooms set phase = 'generating', generation_id = g, generation_started_at = now(),
    topic_attempts = case when topic_window_started_at > now() - interval '1 hour' then topic_attempts + 1 else 1 end,
    topic_window_started_at = case when topic_window_started_at > now() - interval '1 hour' then topic_window_started_at else now() end
    where id = p_room;
  return g;
end;
$$;

-- 위치별 갱신으로 기존 질문 ID와 연결된 투표 데이터를 삭제하지 않는다.
create or replace function public.ice_finish_questions(p_room uuid, p_generation uuid, p_questions jsonb, p_source text)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare r public.ice_rooms%rowtype; item jsonb; i integer := 0;
begin
  select * into r from public.ice_rooms where id = p_room for update;
  if not found or r.phase <> 'generating' or r.generation_id <> p_generation then return false; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) <> 3
     or p_source not in ('openai', 'basic') then raise exception 'invalid_questions'; end if;
  for item in select * from jsonb_array_elements(p_questions) loop
    insert into public.ice_questions(room_id, text, position, source) values(p_room, item #>> '{}', i, p_source)
      on conflict (room_id, position) do update set text = excluded.text, source = excluded.source;
    i := i + 1;
  end loop;
  update public.ice_rooms set phase = 'collecting' where id = p_room;
  return true;
end;
$$;
