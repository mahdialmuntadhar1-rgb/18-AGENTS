# Final Launch-Readiness Review (Codex Reviewer Guide)

Use this checklist as a final pre-launch gate for the 18-AGENTS repository.

## ✅ Environment & configuration

- Verify `.dev.vars.example` includes all required keys and local `.dev.vars` (or Wrangler secrets/vars) are populated:
  - `SUPABASE_URL`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ADMIN_SHARED_SECRET`
  - `GOOGLE_PLACES_API_KEY`
  - `BACKOFF_BASE_SECONDS`
  - `BACKOFF_MAX_SECONDS`
- Confirm `VITE_SUPABASE_URL` points to the intended Supabase project for the UI environment.
- Verify there are no hard-coded secrets in source files.
- Check `wrangler.toml` for:
  - cron schedule of every 10 minutes
  - expected queue producer/consumer bindings
  - current `compatibility_date`
  - required secrets list
- Run baseline checks:
  - `npm install`
  - `npm run typecheck`
  - `npm run lint`
  - `npm run test`
  - `npx wrangler types`
  - `npm run dev` (confirm both UI + Express boot)

## 🗄 Database & migrations

- Cross-check Supabase usage in code against `supabase_schema.sql` and `docs/DB_SCHEMA.md`.
- Confirm all referenced tables/columns exist with matching types:
  - `agents`
  - `agent_tasks`
  - `agent_runs`
  - `agent_logs`
  - `businesses`
  - `governorates`
- Ensure `businesses` includes V4 patch columns from `0002_v4_schema_patch.sql` (including `governorate_id`, `source_hash`, `raw_payload`, and related patch fields).
- Validate migrations on a fresh local stack:
  - `supabase start`
  - `supabase db reset`
  - `supabase db push`
- Confirm `claim_next_task` compiles and is callable.
- Verify `supabase_realtime` publication includes `businesses` and any additional live tables needed by the UI (for example `agent_logs`).
- Verify RLS is enabled where expected and policies support:
  - full runtime access for service-role worker paths
  - properly scoped UI/client access

## 🔁 Supabase & Firebase usage boundary

- Remove or replace remaining mock data in UI workflows before launch.
  - Example targets: `src/pages/ApprovalHub.tsx`, `src/components/admin/SystemLog.tsx`.
- In `src/hooks/useSupabaseRealtime.ts` verify:
  - count query uses `count: 'exact'`
  - channel cleanup calls `supabase.removeChannel(...)` on unmount
  - duplicate feed events are deduplicated where needed
- For business list endpoints / RPC usage (for example discovery feeds):
  - use server/client pagination (`.range(...)`)
  - request `count: 'exact'` for totals
  - do not derive totals from `data.length`
- Audit Firestore usage (for example in `dashboardService.ts` and `AgentCommander.tsx`) and explicitly document intended split:
  - Firestore collections (`raw_businesses`, `businesses`, `agent_tasks`, etc.)
  - Supabase runtime/reporting tables
- If Firestore is being phased out, create and execute a migration plan for remaining Firestore read/write paths.

## 🛰 Runtime & worker verification

- Validate Express API handlers in `server.ts`:
  - `/api/health`
  - `/api/agents`
  - `/api/agents/:agentName/run`
- Confirm CORS/error handling behavior is production-safe.
- Confirm Supabase calls use the service-role runtime client where required.
- Ensure `runGovernor()` catches/logs failures with actionable context.
- Validate worker orchestration paths (`worker/agent-runtime.ts`, `server/governors/*`, `worker/lib/db.ts`):
  - task claim via `claim_next_task`
  - idempotent processing
  - consistent writes for runs/tasks/logs
  - failed-task retry or explicit failure state with reason
- Review `AgentStateDO` durability/concurrency assumptions and checkpoint persistence semantics.

## 🧪 UI & UX final checks

- Discovery feed:
  - geolocation denial fallback is user-friendly
  - empty state is informative
  - fallback query behavior is robust (prefer paginated data access over ad-hoc limits)
- Agent commander/data cleaner:
  - import labels match actual write target
  - if button says “Import to Supabase”, verify it truly writes via Supabase
- Approval hub/dashboard pages:
  - replace static arrays with live data sources
  - wire approve/reject controls to backend writes
  - ensure realtime updates propagate to relevant views

## 📄 Documentation & readiness

- Ensure docs reflect implementation accurately:
  - `README.md`
  - `docs/ARCHITECTURE.md`
  - `docs/DB_SCHEMA.md`
- Complete every item in `MERGE_CHECKLIST.md`.
- Extend `MERGE_CHECKLIST.md` when new launch-critical components are introduced.
- Keep README command examples current, including:
  - `supabase start`
  - `supabase db reset`
  - `supabase db push`
  - `npx wrangler dev`
  - required auth/login steps

## 🔍 General quality & security

- Resolve remaining lint/type warnings before launch.
- Ensure async Supabase/Firebase code paths catch and surface errors to users and/or structured logs.
- Scan for secrets/key leakage in tracked files.
- Validate test coverage for core flows (agent tasks, data cleaning, realtime updates); add integration tests if gaps remain.
- Run a quick accessibility audit:
  - keyboard navigation
  - semantic labels
  - contrast/readability

## Suggested reviewer sign-off fields

- Reviewer:
- Date:
- Environment reviewed:
- Blocking issues found:
- Approved for launch: Yes / No
