# Merge Checklist

## Core build/test gates

- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npx wrangler types` runs to refresh binding types.

## Runtime/API checks

- [ ] `GET /api/health` works locally.
- [ ] `GET /cdn-cgi/handler/scheduled` simulates cron locally.
- [ ] `POST /api/admin/orchestrate` fails without secret and passes with secret.
- [ ] Queue consumer processes claimed tasks successfully in local validation.

## Database and realtime checks

- [ ] `supabase db reset` applies `0001` + `0002` cleanly.
- [ ] `supabase db push --dry-run` reviewed before push.
- [ ] `claim_next_task` function compiles and is callable.
- [ ] `businesses` publication/RLS verified for realtime UI feed.
- [ ] Runtime tables RLS/policies verified for service-role + UI access patterns.

## Security and launch hygiene

- [ ] Required secrets validated in local/prod environment configuration.
- [ ] No mock insertion paths remain in worker runtime.
- [ ] No mock/static UI data remains in launch-critical dashboards.
- [ ] No committed secret leakage (repo scan completed).
- [ ] `docs/ARCHITECTURE.md`, `docs/DB_SCHEMA.md`, and `README.md` match implementation.

## Reviewer handoff

- [ ] `docs/FINAL_CHECK_REVIEW.md` reviewed and completed.
