-- 기존 주제의 실제 생성 시각은 알 수 없으므로 NULL을 유지한다.
-- 성공한 주제 저장과 같은 트랜잭션에서만 마지막 생성 시각을 갱신한다.
alter table public.ice_rooms add column if not exists topics_generated_at timestamptz;

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
  update public.ice_rooms set phase = 'collecting', topics_generated_at = clock_timestamp() where id = p_room;
  return true;
end;
$$;
