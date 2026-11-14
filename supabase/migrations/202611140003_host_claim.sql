-- 기존 조와 프로필은 유지하고, 팀장 선점 상태만 추가한다.
alter table public.ice_rooms add column if not exists host_name text;
