<div align="center">

# 🔔 Nudge — Your Life, Remembered

**Remember the little things. Focus on the big things.**

A calm, personal memory assistant PWA. Type what you want to remember in plain words —
*“Pay electricity bill tomorrow at 9 AM”*, *“Change water filter next month”*, *“Buy milk when
I go shopping”* — and Nudge organizes it, reminds you at the right moment, and keeps a quiet
memory of everything you've done.

</div>

---

## Highlights

- **Quick capture that understands you** — a rule-based natural-language parser extracts dates,
  times, recurrence, categories and list intents from everyday language (works entirely offline
  from any AI; an optional OpenAI key adds an extra assist for ambiguous captures).
- **Reliable reminders** — server-side cron dispatch delivers Web Push notifications even when
  no browser is open. Every occurrence is delivered **at most once** (idempotent dispatcher),
  snooze supported, delivery failures handled and dead subscriptions pruned.
- **Recurring life maintenance** — bedsheets weekly, toothbrush every 3 months, car service every
  6 — recurring reminders roll forward automatically and leave a memory trail.
- **Today dashboard & daily briefing** — overdue, today, upcoming, someday, and a morning
  briefing push that summarizes your day.
- **Quick lists** — shopping lists and checklists; “buy milk when I go shopping” lands straight
  on your Shopping list.
- **Memories** — a timeline of completed reminders, recurred routines and notifications sent.
- **Search** across reminders, notes, list items and past activity.
- **Installable PWA** — manifest, service worker, offline fallback, maskable icons, standalone
  on iOS/Android/desktop, light & dark themes.
- **Private by design** — every table is protected by Postgres Row Level Security. Your rows are
  only ever visible to you.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js (App Router) + TypeScript, Tailwind CSS v4 |
| Database / Auth | Supabase (PostgreSQL, RLS, cookie-based sessions via `@supabase/ssr`) |
| Notifications | Web Push (`web-push` + VAPID), service worker, Vercel Cron dispatcher |
| Hosting | Vercel (or any Node host) |
| Tests | Vitest (parser, recurrence, timezone engine — 50 tests) |

---

## 1 · Local setup

```bash
git clone <your-repo-url> nudge && cd nudge
npm install
cp .env.example .env.local   # then fill in the values (next section)
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm run build        # production build
npm run start        # serve the production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm test             # vitest (parser / recurrence / timezone)
npm run icons        # regenerate PWA icons from scripts/generate-icons.mjs (needs `sharp`)
```

## 2 · Supabase configuration

1. Create a project at [supabase.com](https://supabase.com).
2. **Run the migration.** Open *SQL Editor* and paste the whole of
   [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql), then run it.
   It creates every table, all RLS policies, indexes, the signup trigger (which seeds your
   profile, default categories and starter lists) and the two cron helper functions.
   - Using the CLI instead? `supabase link --project-ref <ref>` then `supabase db push`.
3. **Auth settings** (*Authentication → URL Configuration*):
   - **Site URL**: your app URL, e.g. `http://localhost:3000` (and your production URL later).
   - **Redirect URLs** must include `<APP_URL>/auth/callback`.
   - Enable the *Email* provider. Confirm-email can stay on — the app handles both flows.
4. Copy from *Project Settings → API*: **Project URL**, **anon public key**, **service_role key**.

## 3 · Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Required | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | Public anon key — safe in the browser, RLS protects data |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | **Server only.** Used by the cron dispatcher and account deletion |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | ✅ | Push public key (sent to browsers) |
| `VAPID_PRIVATE_KEY` | ✅ | Push private key (server only) |
| `VAPID_SUBJECT` | ✅ | `mailto:you@example.com` |
| `CRON_SECRET` | ✅ | Long random string guarding `/api/cron/dispatch` |
| `NEXT_PUBLIC_APP_URL` | ✅ | `http://localhost:3000` / your production URL |
| `OPENAI_API_KEY` | – | Optional AI assist for ambiguous captures |
| `OPENAI_MODEL` | – | Defaults to `gpt-4o-mini` |

Generate the missing secrets:

```bash
npx web-push generate-vapid-keys   # VAPID pair
openssl rand -hex 32               # CRON_SECRET
```

> ⚠️ Never expose `SUPABASE_SERVICE_ROLE_KEY` or `VAPID_PRIVATE_KEY` to the client — they are
> read exclusively in server code and must not be prefixed with `NEXT_PUBLIC_`.

## 4 · Push notifications

Nudge uses standard Web Push:

1. Set the three VAPID env vars (above) — locally and on Vercel.
2. Sign in and tap **Enable notifications** on the Today dashboard (or in *Settings →
   Notifications*). Grant permission; a push subscription is stored per device.
3. Verify with **Send test** in Settings — it delivers a real push, and reports honestly when
   no device is subscribed.

**iOS notes:** push requires the app installed to the Home Screen (Add to Home Screen) and iOS
16.4+. Android/desktop browsers work directly. The Settings screen detects unsupported browsers
and explains what to do.

The service worker (`public/sw.js`) displays notifications, deep-links taps to `/today`,
re-subscribes on `pushsubscriptionchange`, and serves an offline fallback page.

## 5 · Scheduling reminders (deployment configuration)

The dispatcher endpoint is **`GET /api/cron/dispatch`**, guarded by
`Authorization: Bearer <CRON_SECRET>`. It is **idempotent** — each reminder occurrence is
delivered at most once (`last_notified_for`), so it's safe to run as often as you like and it
catches up after downtime.

### Vercel Cron

`vercel.json` ships with a once-per-day schedule, which works on **every plan**:

```json
{ "crons": [{ "path": "/api/cron/dispatch", "schedule": "0 8 * * *" }] }
```

Vercel automatically attaches `Authorization: Bearer ${CRON_SECRET}` when that env var is set on
the project. **Set `CRON_SECRET` in Vercel → Settings → Environment Variables.**

For minute-level precision:

- **Vercel Pro/Enterprise** — change the schedule to `* * * * *` (every minute).
- **Hobby plan or external hosting** — point any external scheduler at the same endpoint every
  1–5 minutes. Examples:
  - [cron-job.org](https://cron-job.org) — URL: `https://your-app.vercel.app/api/cron/dispatch`,
    header `Authorization: Bearer <CRON_SECRET>`, every 1 minute.
  - Upstash QStash — schedule a message to the same URL with the auth header.
  - GitHub Actions — see [`docs/examples/cron-dispatch.github-actions.yml`](docs/examples/cron-dispatch.github-actions.yml).

With a daily-only schedule, reminders due during the day are delivered at the next run — nothing
is ever lost, but timing is coarse. The in-app dashboard is always live regardless.

## 6 · Deploy to Vercel

1. Push this repo to GitHub.
2. *Vercel → Add New Project* → import the repo (framework auto-detects Next.js; no build
   settings needed).
3. Add every environment variable from section 3 (Production + Preview).
4. In Supabase → *Auth → URL Configuration*: set **Site URL** to your Vercel URL and add
   `<VERCEL_URL>/auth/callback` to Redirect URLs.
5. Deploy. The first deploy runs the daily cron from `vercel.json` automatically.
6. Visit the app, sign up, complete the 3-step onboarding, enable notifications, and capture
   your first reminder: `Pay electricity bill tomorrow at 9 AM` ☀️

## 7 · Database & security model

```
auth.users ─┬─ profiles          (1:1, created by trigger, timezone/theme/briefing prefs)
            ├─ categories        (seeded: Personal, Shopping, Bills, Home, Health, Work + custom)
            ├─ reminders         (due_at UTC + reminder timezone, recurrence rule, snooze,
            │                     last_notified_for ← idempotent dispatch marker)
            ├─ lists ─ list_items
            ├─ push_subscriptions (endpoint unique, upserted per device)
            └─ reminder_events   (completed / recurring_advanced / notification_sent)
```

- **RLS everywhere**: every table has owner-only `SELECT/INSERT/UPDATE/DELETE` policies using
  `auth.uid()`. The service-role key bypasses RLS only inside trusted server code (cron, account
  deletion).
- **Cron RPCs** (`get_dispatch_batch`, `get_briefing_batch`) are `security definer`, locked to
  `service_role`, and never readable by clients.
- **Validation**: zod schemas validate every API payload server-side; the DB adds `CHECK`
  constraints (title lengths, recurrence types, weekday ranges) as a final line of defense.
- Destructive actions (delete reminder/list/category/account, clear completed) always ask for
  confirmation in the UI.

## 8 · How natural-language parsing works

`src/lib/parse.ts` is a dependency-free, timezone-aware parser:

- dates — today/tomorrow/`tmr`, weekday names, `next monday`, `in 3 days`, `next month`,
  `this weekend`, `3 dec`, `dec 3rd`, `1/12` (day-first), `end of month`, `tonight`;
- times — `9am`, `at 9:30`, `14:00`, noon, midnight, morning/afternoon/evening/tonight/lunch;
- recurrence — daily/weekly/monthly/yearly, `every mon & thu`, `every weekday`, `every 6 months`,
  `every other day`;
- categories — keyword buckets (Bills, Shopping, Health, Home, Work, Personal);
- list intents — `buy …` / `when I go shopping` / `add X to list` → quick lists;
- ambiguous guesses (`next week` → Monday, `this weekend` → Saturday, times that already passed)
  are flagged **needsConfirm** and open a pre-filled editor so you always stay in control.

If `OPENAI_API_KEY` is set, ambiguous captures get a second opinion from the AI (strict JSON,
validated, 10s timeout) and any failure silently falls back to the rule-based result.

## 9 · Project structure

```
src/
  app/
    page.tsx                  landing (Capture · Remember · Relax)
    (auth)/                   login · signup · forgot/reset password
    auth/callback/            PKCE code exchange for email links
    (app)/                    authenticated shell (sidebar + mobile nav)
      today/  reminders/  lists/  memories/  search/  settings/  onboarding/
    api/                      REST handlers (zod-validated, session-authenticated)
      cron/dispatch/          the server-side scheduler (Vercel Cron target)
    manifest.ts  icon.svg     PWA
  components/                 UI kit + feature components
  lib/
    parse.ts  recurrence.ts  time.ts      the reminder engine (timezone-safe)
    supabase/ client·server·admin        RLS-scoped clients; admin is server-only
    push.ts  push-client.ts              Web Push sender / subscriber
    server/ reminders·ai-parse           shared server helpers
  types/index.ts             hand-written Database types (match the migration)
  proxy.ts                    session refresh + route protection + onboarding gate
supabase/migrations/0001_init.sql
docs/examples/               external scheduler examples
public/                      sw.js · offline.html · icons
```

## 10 · Testing

```bash
npm test
```

50 Vitest tests cover the timezone engine (KL + DST zones), recurrence advancement (clamping,
weekday sets, catch-up after downtime) and 30 parser cases drawn from real everyday phrasing.

---

Built with restraint: every feature solves a real everyday problem, and the interface stays out
of the way. If Nudge feels effortless, it's working.
