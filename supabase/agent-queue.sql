-- Queue and business schema used by the 18-agent ingestion system.
create table if not exists public.agent_tasks (
  id bigserial primary key,
  task_type text not null,
  category text,
  city text,
  government_rate text,
  status text default 'pending',
  assigned_agent text,
  created_at timestamptz default now()
);

create index if not exists idx_agent_tasks_status on public.agent_tasks(status);

create table if not exists public.businesses (
  id bigserial primary key,
  name text not null,
  category text,
  government_rate text,
  city text,
  address text,
  phone text,
  website text,
  description text,
  source_url text,
  verification_status text default 'pending',
  created_by_agent text,
  created_at timestamptz default now()
);

create unique index if not exists unique_business on public.businesses(name, city);

-- Keep categories aligned with the frontend grid.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'businesses_category_allowed'
  ) then
    alter table public.businesses
      add constraint businesses_category_allowed
      check (category in ('restaurants','cafes','bakeries','hotels','gyms','beauty_salons','pharmacies','supermarkets'));
  end if;
end $$;

-- Concurrency-safe task claim using SKIP LOCKED.
create or replace function public.claim_agent_task(worker_name text)
returns setof public.agent_tasks
language plpgsql
security definer
as $$
declare
  selected_task public.agent_tasks;
begin
  select *
  into selected_task
  from public.agent_tasks
  where status = 'pending'
  order by created_at
  limit 1
  for update skip locked;

  if selected_task.id is null then
    return;
  end if;

  update public.agent_tasks
  set status = 'processing',
      assigned_agent = worker_name
  where id = selected_task.id
  returning * into selected_task;

  return next selected_task;
end;
$$;
