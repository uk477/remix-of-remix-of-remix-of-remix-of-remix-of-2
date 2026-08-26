# Database schema

- `supabase/migrations/*.sql` — incremental migrations applied to the project database.
- `baseline.sql` — full snapshot of the `public` schema (enums, tables, indexes, grants,
  RLS policies, functions, triggers) as of 2026-08-26. Use it to recreate the database
  from scratch on a new Supabase project, then apply any newer migrations.

## Runtime secrets (not stored in the repo)

Set these in the hosting/environment settings — they are intentionally absent from git:

- `GETXAPI_API_KEY` — X (Twitter) data provider
- `SOCIALPLATFORMS_API_KEY` — boost/SMM provider
- `TELEGRAM_BOT_TOKEN` (and related Telegram notification vars, if used)
- `LOVABLE_API_KEY` — Lovable AI gateway
- Supabase service-role key (managed by the platform)

`.env` in the repo only contains the public Supabase URL / publishable key.
