# Merge Checklist

- [ ] `npm run typecheck` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `supabase db reset` applies 0001 + 0002 cleanly.
- [ ] `supabase db push --dry-run` reviewed before push.
- [ ] `npx wrangler types` runs to refresh binding types.
- [ ] `GET /api/health` works locally.
- [ ] `GET /cdn-cgi/handler/scheduled` simulates cron locally.
- [ ] `POST /api/admin/orchestrate` fails without secret and passes with secret.
- [ ] No mock insertion paths remain in worker runtime.
- [ ] `businesses` publication/RLS verified for realtime UI feed.
