-- Canonical schema for 18-AGENTS runtime.
-- This is the single source of truth. Apply via Supabase migrations.

create extension if not exists pgcrypto;

create table if not exists public.agents (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null unique,
  category text not null,
  government_rate text,
  status text not null default 'idle' check (status in ('idle', 'running', 'error', 'not_configured')),
  enabled boolean not null default true,
  config jsonb not null default '{}'::jsonb,
  last_run_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.agent_runs (
  id uuid primary key,
  agent_id uuid references public.agents(id) on delete set null,
  trigger text not null,
  status text not null check (status in ('running', 'completed', 'failed')),
  processed_tasks integer not null default 0,
  inserted_records integer not null default 0,
  error_message text,
  correlation_id uuid not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.agent_tasks (
  id bigserial primary key,
  agent_id uuid not null references public.agents(id) on delete cascade,
  city text not null,
  category text not null,
  status text not null default 'pending' check (status in ('pending', 'processing', 'retrying', 'failed', 'completed')),
  scheduled_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz,
  attempt_count integer not null default 0,
  max_attempts integer not null default 4,
  idempotency_key text not null,
  run_id uuid references public.agent_runs(id) on delete set null,
  correlation_id uuid,
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (idempotency_key)
);

create table if not exists public.agent_logs (
  id bigserial primary key,
  run_id uuid references public.agent_runs(id) on delete set null,
  agent_id uuid references public.agents(id) on delete set null,
  task_id bigint references public.agent_tasks(id) on delete set null,
  level text not null check (level in ('info', 'warn', 'error')),
  message text not null,
  correlation_id uuid not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  external_id text,
  name text not null,
  category text not null,
  city text not null,
  address text,
  phone text,
  website text,
  source text not null,
  source_url text not null,
  source_url_hash text not null,
  collected_at timestamptz not null,
  raw_payload jsonb not null,
  last_seen_by_agent_id uuid references public.agents(id) on delete set null,
  last_run_id uuid references public.agent_runs(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (source_url_hash)
);

create index if not exists idx_agent_tasks_status_scheduled on public.agent_tasks(status, scheduled_at);
create index if not exists idx_agent_tasks_agent_status on public.agent_tasks(agent_id, status);
create index if not exists idx_businesses_source_hash on public.businesses(source_url_hash);
create index if not exists idx_agent_runs_agent_started on public.agent_runs(agent_id, started_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_agents_updated_at on public.agents;
create trigger trg_agents_updated_at
before update on public.agents
for each row execute function public.set_updated_at();

drop trigger if exists trg_tasks_updated_at on public.agent_tasks;
create trigger trg_tasks_updated_at
before update on public.agent_tasks
for each row execute function public.set_updated_at();

drop trigger if exists trg_businesses_updated_at on public.businesses;
create trigger trg_businesses_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

create or replace function public.claim_next_task(p_agent_id uuid, p_max_attempts integer default 4)
returns setof public.agent_tasks
language plpgsql
as $$
declare
  v_task_id bigint;
begin
  select id into v_task_id
  from public.agent_tasks
  where agent_id = p_agent_id
    and status in ('pending', 'retrying')
    and scheduled_at <= now()
    and attempt_count < p_max_attempts
  order by scheduled_at asc, id asc
  limit 1
  for update skip locked;

  if v_task_id is null then
    return;
  end if;

  return query
  update public.agent_tasks
  set status = 'processing',
      started_at = now(),
      updated_at = now()
  where id = v_task_id
  returning *;
end;
$$;

alter table public.agents enable row level security;
alter table public.agent_runs enable row level security;
alter table public.agent_tasks enable row level security;
alter table public.agent_logs enable row level security;
alter table public.businesses enable row level security;

-- No anonymous/public access by default.
drop policy if exists "deny_all_agents" on public.agents;
create policy "deny_all_agents" on public.agents for all using (false) with check (false);

drop policy if exists "deny_all_agent_runs" on public.agent_runs;
create policy "deny_all_agent_runs" on public.agent_runs for all using (false) with check (false);

drop policy if exists "deny_all_agent_tasks" on public.agent_tasks;
create policy "deny_all_agent_tasks" on public.agent_tasks for all using (false) with check (false);

drop policy if exists "deny_all_agent_logs" on public.agent_logs;
create policy "deny_all_agent_logs" on public.agent_logs for all using (false) with check (false);

drop policy if exists "deny_all_businesses" on public.businesses;
create policy "deny_all_businesses" on public.businesses for all using (false) with check (false);

alter publication supabase_realtime add table public.agents;
alter publication supabase_realtime add table public.agent_tasks;
alter publication supabase_realtime add table public.agent_runs;
alter publication supabase_realtime add table public.agent_logs;
alter publication supabase_realtime add table public.businesses;

insert into public.agents (agent_name, category, government_rate, status, enabled)
values
  ('Agent-01', 'restaurants', 'Rate Level 1', 'idle', true),
  ('Agent-02', 'cafes', 'Rate Level 1', 'not_configured', true),
  ('Agent-03', 'bakeries', 'Rate Level 1', 'not_configured', true),
  ('Agent-04', 'hotels', 'Rate Level 1', 'not_configured', true),
  ('Agent-05', 'gyms', 'Rate Level 2', 'not_configured', true),
  ('Agent-06', 'beauty_salons', 'Rate Level 2', 'not_configured', true),
  ('Agent-07', 'pharmacies', 'Rate Level 2', 'not_configured', true),
  ('Agent-08', 'supermarkets', 'Rate Level 2', 'not_configured', true),
  ('Agent-09', 'restaurants', 'Rate Level 3', 'not_configured', true),
  ('Agent-10', 'cafes', 'Rate Level 3', 'not_configured', true),
  ('Agent-11', 'bakeries', 'Rate Level 3', 'not_configured', true),
  ('Agent-12', 'hotels', 'Rate Level 3', 'not_configured', true),
  ('Agent-13', 'gyms', 'Rate Level 4', 'not_configured', true),
  ('Agent-14', 'beauty_salons', 'Rate Level 4', 'not_configured', true),
  ('Agent-15', 'pharmacies', 'Rate Level 4', 'not_configured', true),
  ('Agent-16', 'supermarkets', 'Rate Level 5', 'not_configured', true),
  ('Agent-17', 'restaurants', 'Rate Level 5', 'not_configured', true),
  ('Agent-18', 'cafes', 'Rate Level 5', 'not_configured', true)
on conflict (agent_name) do nothing;
