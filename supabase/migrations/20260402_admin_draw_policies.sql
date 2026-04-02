create or replace function public.is_admin_user(check_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = check_user_id
      and role = 'admin'
  );
$$;

drop policy if exists "profiles_admin_read_all" on public.profiles;
create policy "profiles_admin_read_all" on public.profiles
for select to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "subscriptions_admin_read_all" on public.subscriptions;
create policy "subscriptions_admin_read_all" on public.subscriptions
for select to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "draw_runs_admin_manage" on public.draw_runs;
create policy "draw_runs_admin_manage" on public.draw_runs
for all to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "draw_entries_admin_read_all" on public.draw_entries;
create policy "draw_entries_admin_read_all" on public.draw_entries
for select to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "draw_entries_admin_insert" on public.draw_entries;
create policy "draw_entries_admin_insert" on public.draw_entries
for insert to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "draw_entries_admin_delete" on public.draw_entries;
create policy "draw_entries_admin_delete" on public.draw_entries
for delete to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "winner_claims_admin_read_all" on public.winner_claims;
create policy "winner_claims_admin_read_all" on public.winner_claims
for select to authenticated
using (public.is_admin_user(auth.uid()));

drop policy if exists "winner_claims_admin_update" on public.winner_claims;
create policy "winner_claims_admin_update" on public.winner_claims
for update to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));
