-- 새 프로토타입 테이블만 생성합니다. 기존 데이터 삭제는 하지 않습니다.
create table public.ice_rooms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 50),
  invite_hash text not null,
  host_hash text not null,
  phase text not null default 'collecting' check (phase in ('collecting', 'generating', 'voting', 'finished')),
  generation_id uuid,
  generation_started_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.ice_profiles (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.ice_rooms(id),
  token_hash text not null unique,
  name text not null check (char_length(name) between 1 and 40),
  occupation text not null,
  experience text not null,
  domains text[] not null,
  introduction text not null check (char_length(introduction) between 1 and 50),
  social_url text not null default '',
  created_at timestamptz not null default now(),
  unique (room_id, id)
);
create table public.ice_questions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.ice_rooms(id),
  text text not null check (char_length(text) between 1 and 200),
  position integer not null,
  source text not null check (source in ('openai', 'basic')),
  unique (room_id, id),
  unique (room_id, position)
);
create table public.ice_votes (
  room_id uuid not null references public.ice_rooms(id),
  profile_id uuid not null,
  question_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (room_id, profile_id),
  foreign key (room_id, profile_id) references public.ice_profiles(room_id, id),
  foreign key (room_id, question_id) references public.ice_questions(room_id, id)
);
alter table public.ice_rooms enable row level security;
alter table public.ice_profiles enable row level security;
alter table public.ice_questions enable row level security;
alter table public.ice_votes enable row level security;
revoke all on public.ice_rooms, public.ice_profiles, public.ice_questions, public.ice_votes from anon, authenticated;
grant all on public.ice_rooms, public.ice_profiles, public.ice_questions, public.ice_votes to service_role;

-- 방 잠금으로 참가와 질문 생성이 겹칠 때 인원·투표 기준을 고정한다.
create function public.ice_join_profile(p_room uuid, p_token_hash text, p_name text, p_occupation text,
  p_experience text, p_domains text[], p_introduction text, p_social_url text)
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare room_phase text; profile_id uuid;
begin
  select phase into room_phase from public.ice_rooms where id = p_room for update;
  if room_phase is distinct from 'collecting' then raise exception 'registration_closed'; end if;
  if (select count(*) from public.ice_profiles where room_id = p_room) >= 30 then raise exception 'room_full'; end if;
  insert into public.ice_profiles(room_id, token_hash, name, occupation, experience, domains, introduction, social_url)
    values(p_room, p_token_hash, p_name, p_occupation, p_experience, p_domains, p_introduction, p_social_url)
    returning id into profile_id;
  return profile_id;
end;
$$;

create function public.ice_begin_questions(p_room uuid)
returns uuid language plpgsql security invoker set search_path = public, pg_temp as $$
declare r public.ice_rooms%rowtype; g uuid := gen_random_uuid();
begin
  select * into r from public.ice_rooms where id = p_room for update;
  if not found then return null; end if;
  if r.phase = 'generating' and r.generation_started_at < now() - interval '1 minute' then
    update public.ice_rooms set generation_id = g, generation_started_at = now() where id = p_room;
    return g;
  end if;
  if r.phase <> 'collecting' or not exists(select 1 from public.ice_profiles where room_id = p_room) then return null; end if;
  update public.ice_rooms set phase = 'generating', generation_id = g, generation_started_at = now() where id = p_room;
  return g;
end;
$$;

create function public.ice_finish_questions(p_room uuid, p_generation uuid, p_questions jsonb, p_source text)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare r public.ice_rooms%rowtype; item jsonb; i integer := 0;
begin
  select * into r from public.ice_rooms where id = p_room for update;
  if not found or r.phase <> 'generating' or r.generation_id <> p_generation then return false; end if;
  if jsonb_typeof(p_questions) <> 'array' or jsonb_array_length(p_questions) not between 3 and 5
     or p_source not in ('openai', 'basic') then raise exception 'invalid_questions'; end if;
  for item in select * from jsonb_array_elements(p_questions) loop
    insert into public.ice_questions(room_id, text, position, source) values(p_room, item #>> '{}', i, p_source);
    i := i + 1;
  end loop;
  update public.ice_rooms set phase = 'voting' where id = p_room;
  return true;
end;
$$;

-- 프로필당 한 표를 제약 조건과 방 잠금으로 보장한다.
create function public.ice_cast_vote(p_room uuid, p_token_hash text, p_question uuid)
returns boolean language plpgsql security invoker set search_path = public, pg_temp as $$
declare r public.ice_rooms%rowtype; person uuid;
begin
  select * into r from public.ice_rooms where id = p_room for update;
  if not found or r.phase <> 'voting' then return false; end if;
  select id into person from public.ice_profiles where room_id = p_room and token_hash = p_token_hash;
  if person is null or not exists(select 1 from public.ice_questions where room_id = p_room and id = p_question) then return false; end if;
  insert into public.ice_votes(room_id, profile_id, question_id)
    values(p_room, person, p_question) on conflict (room_id, profile_id) do nothing;
  if (select count(*) from public.ice_votes where room_id = p_room) >=
     (select count(*) from public.ice_profiles where room_id = p_room) then
    update public.ice_rooms set phase = 'finished' where id = p_room;
  end if;
  return true;
end;
$$;
revoke all on function public.ice_join_profile(uuid,text,text,text,text,text[],text,text) from public, anon, authenticated;
revoke all on function public.ice_begin_questions(uuid) from public, anon, authenticated;
revoke all on function public.ice_finish_questions(uuid,uuid,jsonb,text) from public, anon, authenticated;
revoke all on function public.ice_cast_vote(uuid,text,uuid) from public, anon, authenticated;
grant execute on function public.ice_join_profile(uuid,text,text,text,text,text[],text,text) to service_role;
grant execute on function public.ice_begin_questions(uuid) to service_role;
grant execute on function public.ice_finish_questions(uuid,uuid,jsonb,text) to service_role;
grant execute on function public.ice_cast_vote(uuid,text,uuid) to service_role;
