create extension if not exists pgcrypto;

create table if not exists governorates (
  id text primary key,
  name_en text not null,
  name_ar text,
  name_ku text,
  created_at timestamptz not null default now()
);

create table if not exists agents (
  id text primary key,
  display_name text not null,
  governorate_id text references governorates(id) on delete set null,
  city text not null,
  category text not null,
  government_rate text,
  connector text not null default 'unknown',
  status text not null default 'idle' check (status in ('idle','running','not_configured','error')),
  status_reason text,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists agent_tasks (
  id bigserial primary key,
  agent_id text not null references agents(id) on delete cascade,
  governorate_id text references governorates(id) on delete set null,
  city text not null,
  category text not null,
  government_rate text,
  task_type text not null default 'collect',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','retrying','completed','failed')),
  idempotency_key text not null unique,
  attempt_count integer not null default 0,
  max_attempts integer not null default 5,
  scheduled_at timestamptz not null default now(),
  run_after timestamptz not null default now(),
  claimed_at timestamptz,
  completed_at timestamptz,
  failed_at timestamptz,
  last_error text,
  correlation_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_agent_tasks_ready on agent_tasks (agent_id, status, run_after, scheduled_at);

create table if not exists agent_runs (
  id uuid primary key default gen_random_uuid(),
  agent_id text not null references agents(id) on delete cascade,
  correlation_id text not null,
  status text not null check (status in ('running','completed','failed','not_configured')),
  started_at timestamptz not null,
  finished_at timestamptz,
  summary jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_runs_agent_started on agent_runs (agent_id, started_at desc);

create table if not exists agent_logs (
  id bigserial primary key,
  run_id uuid references agent_runs(id) on delete cascade,
  agent_id text not null references agents(id) on delete cascade,
  task_id bigint references agent_tasks(id) on delete set null,
  level text not null check (level in ('debug','info','warn','error')),
  message text not null,
  correlation_id text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_agent_logs_run on agent_logs (run_id, created_at);

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  governorate_id text references governorates(id) on delete set null,
  external_id text,
  name text not null,
  category text not null,
  city text not null,
  address text,
  phone text,
  website text,
  latitude double precision,
  longitude double precision,
  rating double precision,
  review_count integer,
  source text not null,
  source_url text,
  source_hash text not null unique,
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  collected_at timestamptz not null default now(),
  raw_payload jsonb not null default '{}'::jsonb,
  created_by_agent_id text references agents(id) on delete set null,
  updated_by_agent_id text references agents(id) on delete set null,
  last_task_id bigint references agent_tasks(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_businesses_gov_created on businesses (governorate_id, created_at desc);

create or replace function claim_next_task(p_agent_id text, p_max_attempts integer default 5)
returns setof agent_tasks
language sql
as $$
  with candidate as (
    select id
    from agent_tasks
    where agent_id = p_agent_id
      and status in ('pending','retrying')
      and run_after <= now()
      and attempt_count < p_max_attempts
    order by scheduled_at asc, id asc
    for update skip locked
    limit 1
  )
  update agent_tasks t
    set status = 'processing',
        claimed_at = now(),
        attempt_count = t.attempt_count + 1,
        updated_at = now()
  from candidate
  where t.id = candidate.id
  returning t.*;
$$;

alter table governorates enable row level security;
alter table agents enable row level security;
alter table agent_tasks enable row level security;
alter table agent_runs enable row level security;
alter table agent_logs enable row level security;
alter table businesses enable row level security;

create policy service_role_governorates_all on governorates for all to service_role using (true) with check (true);
create policy service_role_agents_all on agents for all to service_role using (true) with check (true);
create policy service_role_agent_tasks_all on agent_tasks for all to service_role using (true) with check (true);
create policy service_role_agent_runs_all on agent_runs for all to service_role using (true) with check (true);
create policy service_role_agent_logs_all on agent_logs for all to service_role using (true) with check (true);
create policy service_role_businesses_all on businesses for all to service_role using (true) with check (true);
