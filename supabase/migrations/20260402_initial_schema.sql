create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text not null,
  role text not null default 'member' check (role in ('member', 'admin')),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.charities (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  category text not null,
  short_description text not null,
  description text,
  image_url text,
  featured boolean not null default false,
  upcoming_events jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_code text not null check (plan_code in ('monthly', 'yearly')),
  status text not null check (status in ('trialing', 'active', 'past_due', 'canceled', 'lapsed')),
  provider text not null default 'stripe',
  provider_customer_id text,
  provider_subscription_id text unique,
  renewal_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_charity_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  charity_id uuid not null references public.charities(id),
  contribution_percent integer not null check (contribution_percent between 10 and 100),
  independent_donation_enabled boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.golf_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  score integer not null check (score between 1 and 45),
  played_on date not null,
  course_name text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.draw_runs (
  id uuid primary key default gen_random_uuid(),
  month_key text not null unique,
  draw_mode text not null check (draw_mode in ('random', 'weighted')),
  status text not null check (status in ('draft', 'simulated', 'published')),
  winning_numbers integer[] not null default '{}',
  jackpot_pool_cents integer not null default 0,
  tier_4_pool_cents integer not null default 0,
  tier_3_pool_cents integer not null default 0,
  published_at timestamptz,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.draw_entries (
  id uuid primary key default gen_random_uuid(),
  draw_run_id uuid not null references public.draw_runs(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  score_snapshot integer[] not null,
  match_count integer not null default 0 check (match_count between 0 and 5),
  prize_cents integer not null default 0,
  charity_cents integer not null default 0,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.winner_claims (
  id uuid primary key default gen_random_uuid(),
  draw_entry_id uuid not null unique references public.draw_entries(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  proof_file_path text,
  review_status text not null default 'pending' check (review_status in ('pending', 'approved', 'rejected')),
  payout_status text not null default 'pending' check (payout_status in ('pending', 'paid')),
  admin_notes text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_subscriptions_user_id on public.subscriptions(user_id);
create index if not exists idx_golf_scores_user_played_on on public.golf_scores(user_id, played_on desc, created_at desc);
create index if not exists idx_draw_entries_draw_run on public.draw_entries(draw_run_id);
create index if not exists idx_winner_claims_user_id on public.winner_claims(user_id);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data ->> 'full_name', 'New Member')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists charities_set_updated_at on public.charities;
create trigger charities_set_updated_at before update on public.charities
for each row execute procedure public.set_updated_at();

drop trigger if exists subscriptions_set_updated_at on public.subscriptions;
create trigger subscriptions_set_updated_at before update on public.subscriptions
for each row execute procedure public.set_updated_at();

drop trigger if exists charity_preferences_set_updated_at on public.user_charity_preferences;
create trigger charity_preferences_set_updated_at before update on public.user_charity_preferences
for each row execute procedure public.set_updated_at();

drop trigger if exists golf_scores_set_updated_at on public.golf_scores;
create trigger golf_scores_set_updated_at before update on public.golf_scores
for each row execute procedure public.set_updated_at();

drop trigger if exists draw_runs_set_updated_at on public.draw_runs;
create trigger draw_runs_set_updated_at before update on public.draw_runs
for each row execute procedure public.set_updated_at();

drop trigger if exists winner_claims_set_updated_at on public.winner_claims;
create trigger winner_claims_set_updated_at before update on public.winner_claims
for each row execute procedure public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.user_charity_preferences enable row level security;
alter table public.golf_scores enable row level security;
alter table public.draw_entries enable row level security;
alter table public.winner_claims enable row level security;
alter table public.charities enable row level security;
alter table public.draw_runs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
for select to authenticated
using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
for update to authenticated
using (auth.uid() = id);

drop policy if exists "charities_public_read" on public.charities;
create policy "charities_public_read" on public.charities
for select to anon, authenticated
using (is_active = true);

drop policy if exists "draw_runs_public_read" on public.draw_runs;
create policy "draw_runs_public_read" on public.draw_runs
for select to anon, authenticated
using (status = 'published');

drop policy if exists "subscriptions_select_own" on public.subscriptions;
create policy "subscriptions_select_own" on public.subscriptions
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "charity_preferences_manage_own" on public.user_charity_preferences;
create policy "charity_preferences_manage_own" on public.user_charity_preferences
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "golf_scores_manage_own" on public.golf_scores;
create policy "golf_scores_manage_own" on public.golf_scores
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "draw_entries_select_own" on public.draw_entries;
create policy "draw_entries_select_own" on public.draw_entries
for select to authenticated
using (auth.uid() = user_id);

drop policy if exists "winner_claims_manage_own" on public.winner_claims;
create policy "winner_claims_manage_own" on public.winner_claims
for all to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
