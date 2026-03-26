# DB Schema Contract

Core tables:

- `agents`: status and connector metadata.
- `agent_tasks`: durable queue rows.
- `agent_runs`: bounded invocation tracking.
- `agent_logs`: structured correlated logs.
- `businesses`: idempotent ingest target (`source_hash` unique).
- `governorates`: stable region routing/filtering support.

RPC function:

- `claim_next_task(p_agent_id text, p_max_attempts integer)` uses `FOR UPDATE SKIP LOCKED` and atomically flips task state to `processing`.

RLS model:

- RLS enabled for all runtime tables.
- Service-role policies allow worker full access.
- UI-facing policies should be added separately for `anon`/`authenticated` based on product visibility rules.
