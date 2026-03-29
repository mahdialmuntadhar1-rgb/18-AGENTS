-- Runtime Supabase schema for 18-AGENTS
-- Apply this in Supabase SQL editor before running real agents.

create extension if not exists pgcrypto;

create table if not exists businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text not null,
  government_rate text,
  city text not null,
  address text,
  phone text,
  website text,
  description text,
  source_url text,
  created_by_agent text,
  verification_status text default 'pending',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create unique index if not exists businesses_unique_identity_idx
  on businesses (name, address, city);

create table if not exists agents (
  id uuid primary key default gen_random_uuid(),
  agent_name text unique not null,
  category text,
  city text,
  government_rate text,
  status text default 'idle',
  records_collected integer default 0,
  target integer default 1000,
  errors integer default 0,
  last_run timestamptz,
  updated_at timestamptz default now()
);

create table if not exists agent_tasks (
  id bigserial primary key,
  task_name text not null,
  task_type text not null,
  instruction text,
  assigned_to text,
  agent_name text,
  category text,
  city text,
  government_rate text,
  status text not null default 'pending',
  result_summary text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists agent_tasks_agent_status_idx
  on agent_tasks (agent_name, status, created_at);

create table if not exists agent_logs (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  action text not null,
  record_id text,
  details text,
  created_at timestamptz default now()
);

create index if not exists agent_logs_created_at_idx
  on agent_logs (created_at desc);

create or replace function claim_next_task(agent_name text)
returns setof agent_tasks
language plpgsql
security definer
as $$
declare
  claimed_id bigint;
begin
  select id
  into claimed_id
  from agent_tasks
  where status = 'pending'
    and (agent_tasks.agent_name = claim_next_task.agent_name or agent_tasks.agent_name is null)
  order by created_at
  limit 1
  for update skip locked;

  if claimed_id is null then
    return;
  end if;

  update agent_tasks
  set status = 'running', updated_at = now(), agent_name = claim_next_task.agent_name
  where id = claimed_id;

  return query
  select * from agent_tasks where id = claimed_id;
end;
$$;

alter table businesses enable row level security;
alter table agents enable row level security;
alter table agent_tasks enable row level security;
alter table agent_logs enable row level security;
