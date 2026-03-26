create extension if not exists pgcrypto;

alter table if exists businesses add column if not exists governorate_id text;
alter table if exists businesses add column if not exists source_hash text;
alter table if exists businesses add column if not exists raw_payload jsonb default '{}'::jsonb;
alter table if exists businesses add column if not exists collected_at timestamptz default now();
alter table if exists businesses add column if not exists updated_by_agent_id text;
alter table if exists businesses add column if not exists created_by_agent_id text;
alter table if exists businesses add column if not exists last_task_id bigint;

update businesses
set source_hash = encode(digest(coalesce(source_url, '') || '|' || coalesce(name, '') || '|' || coalesce(city, ''), 'sha256'), 'hex')
where source_hash is null;

alter table if exists businesses alter column source_hash set not null;
create unique index if not exists uq_businesses_source_hash on businesses(source_hash);

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

alter publication supabase_realtime add table businesses;
