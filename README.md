# Iraq Compass Agent Runtime (V4)

Cloudflare Workers runtime for durable data collection using **Cron Triggers + Queues + Durable Objects + Supabase**.

## Architecture

- `scheduled()` (UTC cron) enqueues orchestration messages.
- Queue consumer claims durable DB-backed tasks via `claim_next_task`.
- Worker writes run/task/log state to Supabase.
- Durable Object keeps lightweight checkpoint metadata only.
- Businesses are persisted idempotently using `source_hash` conflict handling.

See `docs/ARCHITECTURE.md` and `docs/DB_SCHEMA.md` for details.

## Environment and secrets

Use `.dev.vars` for local Wrangler runs (copy from `.dev.vars.example`).

Required secrets:
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SHARED_SECRET`
- `GOOGLE_PLACES_API_KEY`

## Database migrations

- Canonical fresh install migration: `supabase/migrations/0001_agent_runtime.sql`
- Forward-only repair migration: `supabase/migrations/0002_v4_schema_patch.sql`
- Optional bootstrap data: `supabase/seed.sql`

Typical workflow:

```bash
supabase start
supabase db reset
supabase db push
```


## Tooling authentication

Before running Supabase/Wrangler commands, authenticate locally:

```bash
supabase login
npx wrangler login
```

If you use CI-managed tokens, ensure equivalent auth is configured via environment variables before running deploy commands.

## Runtime endpoints

- `GET /api/health` → basic liveness/version/time.
- `POST /api/admin/orchestrate` → protected by `x-admin-secret`.

## Local validation

```bash
npm install
npm run typecheck
npm run lint
npm run test
npx wrangler@latest dev
curl -sS http://localhost:8787/api/health
curl -sS "http://localhost:8787/cdn-cgi/handler/scheduled"
curl -sS -X POST http://localhost:8787/api/admin/orchestrate -H "x-admin-secret: $ADMIN_SHARED_SECRET"
```

## Realtime for UI

To support the app live feed, ensure `businesses` is in publication:

```sql
alter publication supabase_realtime add table businesses;
```

When using Postgres Changes with RLS, your `SELECT` policies determine which rows client subscriptions receive.

## Launch readiness review

Use `docs/FINAL_CHECK_REVIEW.md` as the final reviewer checklist before merging launch-bound changes.

