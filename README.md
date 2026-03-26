# Iraq Compass Data Verification Dashboard + 18-AGENTS Runtime

Internal tool to clean, verify, and approve Iraqi business records, plus a production Cloudflare Worker runtime for autonomous collection.

## Runtime Entrypoints

- **Worker entrypoint**: `worker/agent-runtime.ts` (Cloudflare Cron + Queue + Durable Object + admin API).
- **Worker config**: `wrangler.toml`.
- **Legacy local server**: `server.ts` (UI/dev server; no longer the production orchestrator runtime).
- **Client entrypoint**: `src/main.tsx`.

## Production Runtime Model

- Cron (`*/5 * * * *`) enqueues an `orchestrate` queue message.
- Queue consumer handles orchestration and per-agent work messages.
- Per-agent checkpoint and metadata are persisted in Durable Object `AgentStateDO`.
- Supabase stores durable lifecycle data (`agent_tasks`, `agent_runs`, `agent_logs`, `businesses`).
- At-least-once safe behavior uses idempotent upsert on `businesses.source_url_hash`.

## Required Secrets (Cloudflare)

Set with `wrangler secret put`:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_SHARED_SECRET`
- `GOOGLE_PLACES_API_KEY` (required for restaurants connector)

The worker fails fast for runtime operations if required env is missing. `/api/health` still returns 200 for platform checks.

## Admin API

All `/api/admin/*` endpoints require header `x-admin-secret: <ADMIN_SHARED_SECRET>`.

- `POST /api/admin/orchestrate`
- `POST /api/admin/run-agent` body: `{ "agentId": "<uuid>" }`
- `GET /api/admin/metrics`

`GET /api/health` is always public and returns build/version metadata.

## Canonical Supabase Migration

Use only:

- `supabase/migrations/0001_agent_runtime.sql`

Do **not** apply `schema.sql` or `supabase_schema.sql` directly; those files are deprecated placeholders.

## Local Run

```bash
npm install
npm run lint
npx wrangler dev
```

## Cloudflare 403 Checklist

If `/` or `/api/health` returns `403`, verify:

1. Worker is deployed and route points to this script (`main = worker/agent-runtime.ts`).
2. Cloudflare Access is not requiring identity for `/api/health`.
3. WAF custom rules are not blocking your host/path or User-Agent.
4. Zone route precedence is not shadowing this worker with another worker/redirect.
5. Firewall rules are not geoblocking your testing IP.
6. `workers.dev` subdomain is enabled if testing on workers.dev URL.

## Security Notes

- Never commit tokens/secrets.
- If any GitHub/Supabase token is exposed, treat it as compromised and revoke/rotate immediately.
