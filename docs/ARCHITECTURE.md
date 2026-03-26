# Architecture

## Flow

1. Cloudflare cron (`scheduled`) enqueues `{ type: "orchestrate" }`.
2. Queue consumer fetches all agents.
3. Per agent, worker calls SQL RPC `claim_next_task(p_agent_id, p_max_attempts)`.
4. Worker fetches **real** provider data (no synthetic fallback).
5. Worker UPSERTs `businesses` on `source_hash`.
6. Worker updates task state (`completed`, `retrying`, `failed`) and run/log tables.
7. Worker stores checkpoint metadata in `AgentStateDO`.

## Design constraints

- Queue and cron invocations are bounded and resumable.
- Durable queue state lives in Postgres (`agent_tasks`), not in memory.
- Durable Object stores coordination/checkpoint metadata only.
- Missing connector configuration resolves to `not_configured` with no business inserts.
