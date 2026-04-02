drop policy if exists "charities_admin_insert" on public.charities;
create policy "charities_admin_insert" on public.charities
for insert to authenticated
with check (public.is_admin_user(auth.uid()));

drop policy if exists "charities_admin_update" on public.charities;
create policy "charities_admin_update" on public.charities
for update to authenticated
using (public.is_admin_user(auth.uid()))
with check (public.is_admin_user(auth.uid()));

drop policy if exists "charities_admin_read_all" on public.charities;
create policy "charities_admin_read_all" on public.charities
for select to authenticated
using (public.is_admin_user(auth.uid()));
