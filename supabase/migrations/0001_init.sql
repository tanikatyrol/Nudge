-- ══════════════════════════════════════════════════════════════════════════════
-- NUDGE — initial schema
-- Tables: profiles, categories, reminders, lists, list_items,
--         push_subscriptions, reminder_events
-- Every table is protected with Row Level Security (owner-only access).
-- Apply with:  supabase db push   (or paste into the SQL editor)
-- ══════════════════════════════════════════════════════════════════════════════

create extension if not exists pgcrypto;

-- ── updated_at helper ─────────────────────────────────────────────────────────
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ── profiles ──────────────────────────────────────────────────────────────────
-- One row per auth user, created automatically by a trigger on signup.
create table public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  email               text,
  display_name        text check (display_name is null or char_length(display_name) <= 80),
  timezone            text not null default 'Asia/Kuala_Lumpur',
  theme               text not null default 'system' check (theme in ('light', 'dark', 'system')),
  push_enabled        boolean not null default true,
  briefing_enabled    boolean not null default true,
  briefing_time       time not null default '08:00',
  onboarded_at        timestamptz,
  last_briefing_date  date,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ── categories ────────────────────────────────────────────────────────────────
create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 40),
  color       text not null default 'navy'
              check (color in ('lilac', 'peach', 'sage', 'sky', 'butter', 'coral', 'navy')),
  icon        text not null default 'tag',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index categories_user_idx on public.categories (user_id, sort_order);

-- ── reminders ─────────────────────────────────────────────────────────────────
-- due_at is an absolute UTC instant (wall-clock time in `timezone`).
-- A reminder without due_at is a "someday" note.
-- Recurrence:
--   none    → one-time reminder
--   daily   → every `recurrence_interval` days, same local time
--   weekly  → every N weeks on `recurrence_weekdays` (0 = Sunday … 6 = Saturday)
--   monthly → every N months, same day-of-month (clamped to month length)
--   custom  → every `recurrence_interval` days (free-form maintenance interval)
create table public.reminders (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users (id) on delete cascade,
  category_id          uuid references public.categories (id) on delete set null,
  title                text not null check (char_length(title) between 1 and 200),
  notes                text check (notes is null or char_length(notes) <= 2000),
  due_at               timestamptz,
  is_all_day           boolean not null default false,
  timezone             text not null default 'Asia/Kuala_Lumpur',
  recurrence_type      text not null default 'none'
                       check (recurrence_type in ('none', 'daily', 'weekly', 'monthly', 'custom')),
  recurrence_interval  integer not null default 1 check (recurrence_interval between 1 and 365),
  recurrence_weekdays  smallint[] not null default '{}',
  status               text not null default 'active' check (status in ('active', 'completed')),
  completed_at         timestamptz,
  snoozed_until        timestamptz,
  -- the effective-due instant we last delivered a notification for —
  -- guarantees each occurrence notifies exactly once (idempotent cron)
  last_notified_for    timestamptz,
  last_notified_at     timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  constraint reminders_weekdays_valid
    check (recurrence_weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[])
);

create index reminders_user_idx       on public.reminders (user_id, status, due_at);
create index reminders_category_idx   on public.reminders (category_id);
create index reminders_dispatch_idx   on public.reminders (due_at)
  where status = 'active' and due_at is not null;
create index reminders_snooze_idx     on public.reminders (snoozed_until)
  where status = 'active' and snoozed_until is not null;

create trigger reminders_set_updated_at
  before update on public.reminders
  for each row execute function public.set_updated_at();

-- ── lists (quick lists & checklists) ──────────────────────────────────────────
create table public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 1 and 60),
  icon        text not null default '📝' check (char_length(icon) <= 8),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index lists_user_idx on public.lists (user_id, sort_order);

create trigger lists_set_updated_at
  before update on public.lists
  for each row execute function public.set_updated_at();

create table public.list_items (
  id            uuid primary key default gen_random_uuid(),
  list_id       uuid not null references public.lists (id) on delete cascade,
  user_id       uuid not null references auth.users (id) on delete cascade,
  content       text not null check (char_length(content) between 1 and 300),
  is_completed  boolean not null default false,
  completed_at  timestamptz,
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);

create index list_items_list_idx on public.list_items (list_id, position);
create index list_items_user_idx on public.list_items (user_id);

-- ── push subscriptions ────────────────────────────────────────────────────────
create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique,
  p256dh      text not null,
  auth_key    text not null,
  user_agent  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id);

create trigger push_subscriptions_set_updated_at
  before update on public.push_subscriptions
  for each row execute function public.set_updated_at();

-- ── reminder_events (memory history / activity log) ──────────────────────────
-- kind: 'completed'          → user completed an occurrence
--       'recurring_advanced' → a recurring occurrence elapsed and rolled forward
--       'notification_sent'  → a push notification was delivered for an occurrence
create table public.reminder_events (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references auth.users (id) on delete cascade,
  reminder_id     uuid references public.reminders (id) on delete set null,
  reminder_title  text not null,
  category_name   text,
  kind            text not null
                  check (kind in ('completed', 'recurring_advanced', 'notification_sent')),
  occurred_at     timestamptz not null default now(),
  meta            jsonb
);

create index reminder_events_user_idx     on public.reminder_events (user_id, occurred_at desc);
create index reminder_events_reminder_idx on public.reminder_events (reminder_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- Row Level Security — every table locked to its owner
-- ══════════════════════════════════════════════════════════════════════════════

alter table public.profiles            enable row level security;
alter table public.categories          enable row level security;
alter table public.reminders           enable row level security;
alter table public.lists               enable row level security;
alter table public.list_items          enable row level security;
alter table public.push_subscriptions  enable row level security;
alter table public.reminder_events     enable row level security;

-- profiles: owner can read and update (created by trigger; deleted via cascade)
create policy "profiles_select_own" on public.profiles
  for select to authenticated using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- categories
create policy "categories_select_own" on public.categories
  for select to authenticated using (auth.uid() = user_id);
create policy "categories_insert_own" on public.categories
  for insert to authenticated with check (auth.uid() = user_id);
create policy "categories_update_own" on public.categories
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "categories_delete_own" on public.categories
  for delete to authenticated using (auth.uid() = user_id);

-- reminders
create policy "reminders_select_own" on public.reminders
  for select to authenticated using (auth.uid() = user_id);
create policy "reminders_insert_own" on public.reminders
  for insert to authenticated with check (auth.uid() = user_id);
create policy "reminders_update_own" on public.reminders
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reminders_delete_own" on public.reminders
  for delete to authenticated using (auth.uid() = user_id);

-- lists
create policy "lists_select_own" on public.lists
  for select to authenticated using (auth.uid() = user_id);
create policy "lists_insert_own" on public.lists
  for insert to authenticated with check (auth.uid() = user_id);
create policy "lists_update_own" on public.lists
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "lists_delete_own" on public.lists
  for delete to authenticated using (auth.uid() = user_id);

-- list items (owner-scoped on both user_id and parent list)
create policy "list_items_select_own" on public.list_items
  for select to authenticated using (auth.uid() = user_id);
create policy "list_items_insert_own" on public.list_items
  for insert to authenticated
  with check (auth.uid() = user_id and exists (
    select 1 from public.lists l where l.id = list_id and l.user_id = auth.uid()
  ));
create policy "list_items_update_own" on public.list_items
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "list_items_delete_own" on public.list_items
  for delete to authenticated using (auth.uid() = user_id);

-- push subscriptions
create policy "push_subscriptions_select_own" on public.push_subscriptions
  for select to authenticated using (auth.uid() = user_id);
create policy "push_subscriptions_insert_own" on public.push_subscriptions
  for insert to authenticated with check (auth.uid() = user_id);
create policy "push_subscriptions_update_own" on public.push_subscriptions
  for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "push_subscriptions_delete_own" on public.push_subscriptions
  for delete to authenticated using (auth.uid() = user_id);

-- reminder events: readable + insertable by owner (written by the app and cron)
create policy "reminder_events_select_own" on public.reminder_events
  for select to authenticated using (auth.uid() = user_id);
create policy "reminder_events_insert_own" on public.reminder_events
  for insert to authenticated with check (auth.uid() = user_id);
create policy "reminder_events_delete_own" on public.reminder_events
  for delete to authenticated using (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- Signup trigger — create profile, default categories and starter lists
-- ══════════════════════════════════════════════════════════════════════════════

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'full_name', ''),
      split_part(coalesce(new.email, 'friend'), '@', 1)
    )
  );

  insert into public.categories (user_id, name, color, icon, sort_order) values
    (new.id, 'Personal', 'lilac',  'user',          1),
    (new.id, 'Shopping', 'butter', 'shopping-cart', 2),
    (new.id, 'Bills',    'peach',  'receipt',       3),
    (new.id, 'Home',     'sage',   'home',          4),
    (new.id, 'Health',   'sky',    'heart-pulse',   5),
    (new.id, 'Work',     'navy',   'briefcase',     6);

  insert into public.lists (user_id, name, icon, sort_order) values
    (new.id, 'Shopping', '🛒', 1),
    (new.id, 'To-do',    '✅', 2);

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ══════════════════════════════════════════════════════════════════════════════
-- Cron helper functions (service_role only — called by /api/cron/dispatch)
-- ══════════════════════════════════════════════════════════════════════════════

-- Reminders whose effective due time (snoozed_until ?? due_at) has passed and
-- that have not yet been notified for that occurrence.
create or replace function public.get_dispatch_batch(p_now timestamptz default now())
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(row)), '[]'::jsonb)
  from (
    select
      r.id,
      r.user_id,
      r.title,
      r.notes,
      r.due_at,
      coalesce(r.snoozed_until, r.due_at)          as effective_due,
      r.is_all_day,
      r.recurrence_type,
      r.recurrence_interval,
      r.recurrence_weekdays,
      r.timezone                                   as reminder_timezone,
      p.timezone                                   as user_timezone,
      p.push_enabled,
      p.display_name
    from public.reminders r
    join public.profiles p on p.id = r.user_id
    where r.status = 'active'
      and r.due_at is not null
      and coalesce(r.snoozed_until, r.due_at) <= p_now
      and (r.last_notified_for is null or r.last_notified_for < coalesce(r.snoozed_until, r.due_at))
    order by coalesce(r.snoozed_until, r.due_at) asc
    limit 200
  ) as row;
$$;

-- Profiles whose daily briefing is due right now (once per local day, only in
-- a sensible window so a missed cron never sends a midnight briefing).
create or replace function public.get_briefing_batch(p_now timestamptz default now())
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(jsonb_agg(to_jsonb(row)), '[]'::jsonb)
  from (
    select
      p.id,
      p.display_name,
      p.timezone,
      (select count(*) from public.reminders r
        where r.user_id = p.id
          and r.status = 'active'
          and r.due_at is not null
          and r.due_at < p_now)                                            as overdue_count,
      (select count(*) from public.reminders r
        where r.user_id = p.id
          and r.status = 'active'
          and r.due_at is not null
          and r.due_at >= p_now
          and (r.due_at at time zone p.timezone)::date
              = (p_now at time zone p.timezone)::date)                     as due_today_count,
      (select count(*) from public.reminders r
        where r.user_id = p.id
          and r.status = 'active'
          and r.due_at is not null
          and r.due_at >= p_now
          and (r.due_at at time zone p.timezone)::date
              <= (p_now at time zone p.timezone)::date + 7)                as upcoming_week_count
    from public.profiles p
    where p.briefing_enabled
      and p.push_enabled
      and (p.last_briefing_date is null
           or p.last_briefing_date < (p_now at time zone p.timezone)::date)
      and (p_now at time zone p.timezone)::time >= p.briefing_time
      and (p_now at time zone p.timezone)::time < time '22:00'
    limit 200
  ) as row;
$$;

revoke all on function public.get_dispatch_batch(timestamptz) from public, anon, authenticated;
revoke all on function public.get_briefing_batch(timestamptz) from public, anon, authenticated;
grant execute on function public.get_dispatch_batch(timestamptz) to service_role;
grant execute on function public.get_briefing_batch(timestamptz) to service_role;
