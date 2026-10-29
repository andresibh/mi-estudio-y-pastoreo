-- Ejecutar una vez en SQL Editor de TU proyecto de Supabase.
begin;
create table if not exists public.mep_libraries (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null check (jsonb_typeof(data->'temas') = 'array' and jsonb_typeof(data->'refs') = 'array'),
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);
alter table public.mep_libraries enable row level security;
revoke all on public.mep_libraries from anon, authenticated;
grant select, insert, update on public.mep_libraries to authenticated;
drop policy if exists mep_select_own on public.mep_libraries;
drop policy if exists mep_insert_own on public.mep_libraries;
drop policy if exists mep_update_own on public.mep_libraries;
create policy mep_select_own on public.mep_libraries for select to authenticated using ((select auth.uid()) = user_id);
create policy mep_insert_own on public.mep_libraries for insert to authenticated with check ((select auth.uid()) = user_id);
create policy mep_update_own on public.mep_libraries for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create or replace function public.mep_save(p_data jsonb, p_expected bigint)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result public.mep_libraries;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  if p_data is null or not (p_data ? 'temas' and p_data ? 'refs')
     or jsonb_typeof(p_data->'temas') <> 'array' or jsonb_typeof(p_data->'refs') <> 'array'
     or octet_length(p_data::text) > 4000000 then raise exception 'Invalid library'; end if;
  if p_expected = 0 then
    insert into public.mep_libraries(user_id, data, revision)
      values(auth.uid(), p_data, 1) on conflict(user_id) do nothing returning * into result;
  else
    update public.mep_libraries set data=p_data, revision=revision+1, updated_at=now()
      where user_id=auth.uid() and revision=p_expected returning * into result;
  end if;
  if result.user_id is null then
    return jsonb_build_object('conflict', true);
  end if;
  return jsonb_build_object('conflict', false, 'revision', result.revision, 'updated_at', result.updated_at);
end;
$$;
revoke all on function public.mep_save(jsonb,bigint) from public, anon;
grant execute on function public.mep_save(jsonb,bigint) to authenticated;
commit;
