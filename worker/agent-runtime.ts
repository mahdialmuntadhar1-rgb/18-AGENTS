import { createClient, type SupabaseClient } from '@supabase/supabase-js';

type TaskStatus = 'pending' | 'processing' | 'retrying' | 'failed' | 'completed';

type QueueEnvelope =
  | { type: 'orchestrate'; reason: 'cron' | 'manual'; correlationId: string; at: string }
  | { type: 'run-agent'; agentId: string; correlationId: string; enqueuedAt: string };

interface AgentRow {
  id: string;
  agent_name: string;
  category: string;
  status: string;
  government_rate: string | null;
  config: Record<string, unknown> | null;
}

interface AgentTaskRow {
  id: number;
  agent_id: string;
  city: string;
  category: string;
  status: TaskStatus;
  scheduled_at: string;
  attempt_count: number;
  idempotency_key: string;
}

interface BusinessRecord {
  external_id?: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  phone?: string;
  website?: string;
  source: string;
  source_url: string;
  collected_at: string;
  raw_payload: unknown;
}

interface AgentCheckpoint {
  cursor?: string;
  lastRunAt?: string;
  lastRunStatus?: 'success' | 'error';
  lastRunId?: string;
  lastTaskId?: number;
  consecutiveFailures?: number;
}

interface Env {
  AGENT_TASK_QUEUE: Queue;
  AGENT_STATE_DO: DurableObjectNamespace;
  SUPABASE_URL?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GOOGLE_PLACES_API_KEY?: string;
  ADMIN_SHARED_SECRET?: string;
  BUILD_VERSION?: string;
  MAX_TASKS_PER_RUN?: string;
  MAX_SECONDS_PER_RUN?: string;
  MAX_ATTEMPTS?: string;
  RETRY_BASE_SECONDS?: string;
}

const DEFAULT_MAX_TASKS = 5;
const DEFAULT_MAX_SECONDS = 20;
const DEFAULT_MAX_ATTEMPTS = 4;
const DEFAULT_RETRY_BASE_SECONDS = 30;

function jsonLog(level: 'info' | 'warn' | 'error', message: string, context: Record<string, unknown>) {
  console.log(JSON.stringify({ level, message, ts: new Date().toISOString(), ...context }));
}

function requireRuntimeEnv(env: Env): asserts env is Env & { SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string; ADMIN_SHARED_SECRET: string } {
  const missing = ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'ADMIN_SHARED_SECRET'].filter((key) => {
    const value = env[key as keyof Env];
    return !value || `${value}`.trim().length === 0;
  });

  if (missing.length > 0) {
    throw new Error(`Missing required env bindings: ${missing.join(', ')}`);
  }
}

function getSupabase(env: Env): SupabaseClient {
  requireRuntimeEnv(env);
  return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
}

function getAdminSecret(request: Request): string | null {
  return request.headers.get('x-admin-secret');
}

function requireAdmin(request: Request, env: Env): Response | null {
  requireRuntimeEnv(env);
  const actual = getAdminSecret(request);
  if (!actual || actual !== env.ADMIN_SHARED_SECRET) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  }
  return null;
}

function expBackoffSeconds(attemptCount: number, base: number): number {
  return base * 2 ** Math.max(0, attemptCount - 1);
}

async function sourceUrlHash(url: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function saveLog(
  supabase: SupabaseClient,
  payload: {
    runId: string;
    agentId: string;
    taskId?: number;
    level: 'info' | 'warn' | 'error';
    message: string;
    correlationId: string;
    metadata?: Record<string, unknown>;
  },
) {
  await supabase.from('agent_logs').insert({
    run_id: payload.runId,
    agent_id: payload.agentId,
    task_id: payload.taskId ?? null,
    level: payload.level,
    message: payload.message,
    correlation_id: payload.correlationId,
    metadata: payload.metadata ?? {},
  });
}

async function upsertBusiness(supabase: SupabaseClient, agentId: string, runId: string, record: BusinessRecord) {
  const hash = await sourceUrlHash(record.source_url);
  const { error } = await supabase.from('businesses').upsert(
    {
      external_id: record.external_id ?? null,
      name: record.name,
      category: record.category,
      city: record.city,
      address: record.address ?? null,
      phone: record.phone ?? null,
      website: record.website ?? null,
      source: record.source,
      source_url: record.source_url,
      source_url_hash: hash,
      collected_at: record.collected_at,
      raw_payload: record.raw_payload,
      last_seen_by_agent_id: agentId,
      last_run_id: runId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'source_url_hash' },
  );

  if (error) throw error;
}

interface Connector {
  collect(task: AgentTaskRow, env: Env, checkpoint: AgentCheckpoint): Promise<{ records: BusinessRecord[]; checkpoint?: AgentCheckpoint }>;
}

class GooglePlacesRestaurantsConnector implements Connector {
  async collect(task: AgentTaskRow, env: Env): Promise<{ records: BusinessRecord[]; checkpoint?: AgentCheckpoint }> {
    if (!env.GOOGLE_PLACES_API_KEY) {
      throw new Error('NOT_CONFIGURED: GOOGLE_PLACES_API_KEY missing');
    }

    const query = encodeURIComponent(`restaurants in ${task.city}, Iraq`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${env.GOOGLE_PLACES_API_KEY}`;
    const resp = await fetch(url);
    const body = await resp.json() as any;

    if (!resp.ok || body.status === 'REQUEST_DENIED') {
      throw new Error(`Google Places error: ${body.status ?? resp.status}`);
    }

    const records: BusinessRecord[] = (body.results ?? []).map((place: any) => ({
      external_id: place.place_id,
      name: place.name,
      category: task.category,
      city: task.city,
      address: place.formatted_address,
      source: 'google_places',
      source_url: place.place_id ? `https://maps.google.com/?cid=${place.place_id}` : `https://maps.google.com/?q=${encodeURIComponent(place.name)}`,
      collected_at: new Date().toISOString(),
      raw_payload: place,
    }));

    return { records };
  }
}

class NotImplementedConnector implements Connector {
  constructor(private readonly reason: string) {}

  async collect(): Promise<{ records: BusinessRecord[]; checkpoint?: AgentCheckpoint }> {
    throw new Error(`NOT_IMPLEMENTED: ${this.reason}`);
  }
}

function getConnector(agent: AgentRow): Connector {
  if (agent.category.toLowerCase() === 'restaurants') {
    return new GooglePlacesRestaurantsConnector();
  }
  return new NotImplementedConnector(`No connector for category ${agent.category}`);
}

async function upsertRunStart(supabase: SupabaseClient, payload: { runId: string; agentId?: string; trigger: string; correlationId: string }) {
  await supabase.from('agent_runs').upsert(
    {
      id: payload.runId,
      agent_id: payload.agentId ?? null,
      trigger: payload.trigger,
      status: 'running',
      started_at: new Date().toISOString(),
      correlation_id: payload.correlationId,
    },
    { onConflict: 'id' },
  );
}

async function finishRun(
  supabase: SupabaseClient,
  runId: string,
  status: 'completed' | 'failed',
  processedTasks: number,
  insertedRecords: number,
  error?: string,
) {
  await supabase
    .from('agent_runs')
    .update({
      status,
      processed_tasks: processedTasks,
      inserted_records: insertedRecords,
      error_message: error ?? null,
      completed_at: new Date().toISOString(),
    })
    .eq('id', runId);
}

async function enqueueAgentRuns(env: Env, supabase: SupabaseClient, correlationId: string) {
  const { data: agents, error } = await supabase.from('agents').select('*').eq('enabled', true);
  if (error) throw error;

  let enqueued = 0;
  for (const agent of (agents ?? []) as AgentRow[]) {
    await env.AGENT_TASK_QUEUE.send({
      type: 'run-agent',
      agentId: agent.id,
      correlationId,
      enqueuedAt: new Date().toISOString(),
    } satisfies QueueEnvelope);
    enqueued += 1;
  }

  return { enqueued };
}

async function runAgentBatch(env: Env, agentId: string, correlationId: string) {
  const supabase = getSupabase(env);
  const maxTasksPerRun = Number(env.MAX_TASKS_PER_RUN ?? DEFAULT_MAX_TASKS);
  const maxSecondsPerRun = Number(env.MAX_SECONDS_PER_RUN ?? DEFAULT_MAX_SECONDS);
  const maxAttempts = Number(env.MAX_ATTEMPTS ?? DEFAULT_MAX_ATTEMPTS);
  const retryBaseSeconds = Number(env.RETRY_BASE_SECONDS ?? DEFAULT_RETRY_BASE_SECONDS);
  const runId = crypto.randomUUID();
  const started = Date.now();

  await upsertRunStart(supabase, { runId, agentId, trigger: 'queue', correlationId });

  const { data: agent, error: agentError } = await supabase.from('agents').select('*').eq('id', agentId).single();
  if (agentError || !agent) {
    await finishRun(supabase, runId, 'failed', 0, 0, 'Agent not found');
    return;
  }

  const stub = env.AGENT_STATE_DO.get(env.AGENT_STATE_DO.idFromName(agentId));
  const checkpointResp = await stub.fetch('https://state/checkpoint');
  const checkpoint = ((await checkpointResp.json()) as AgentCheckpoint) ?? {};

  const connector = getConnector(agent as AgentRow);

  let processedTasks = 0;
  let insertedRecords = 0;

  while (processedTasks < maxTasksPerRun && (Date.now() - started) / 1000 < maxSecondsPerRun) {
    const { data: claimData, error: claimError } = await supabase.rpc('claim_next_task', {
      p_agent_id: agentId,
      p_max_attempts: maxAttempts,
    });

    if (claimError) {
      await saveLog(supabase, {
        runId,
        agentId,
        level: 'error',
        message: 'claim_next_task failed',
        correlationId,
        metadata: { error: claimError.message },
      });
      throw claimError;
    }

    const task = (claimData as AgentTaskRow[] | null)?.[0];
    if (!task) break;

    processedTasks += 1;
    try {
      const collection = await connector.collect(task, env, checkpoint);
      for (const record of collection.records) {
        await upsertBusiness(supabase, agentId, runId, record);
        insertedRecords += 1;
      }

      await supabase
        .from('agent_tasks')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          run_id: runId,
          last_error: null,
        })
        .eq('id', task.id);

      await stub.fetch('https://state/checkpoint', {
        method: 'POST',
        body: JSON.stringify({
          ...checkpoint,
          ...(collection.checkpoint ?? {}),
          lastRunAt: new Date().toISOString(),
          lastRunStatus: 'success',
          lastRunId: runId,
          lastTaskId: task.id,
          consecutiveFailures: 0,
        } satisfies AgentCheckpoint),
      });

      await saveLog(supabase, {
        runId,
        agentId,
        taskId: task.id,
        level: 'info',
        message: 'task completed',
        correlationId,
        metadata: { insertedRecords },
      });
    } catch (error: any) {
      const nextAttempt = (task.attempt_count ?? 0) + 1;
      const terminal = nextAttempt >= maxAttempts || `${error?.message ?? ''}`.startsWith('NOT_IMPLEMENTED') || `${error?.message ?? ''}`.startsWith('NOT_CONFIGURED');
      const retryDelay = expBackoffSeconds(nextAttempt, retryBaseSeconds);
      const scheduledAt = new Date(Date.now() + retryDelay * 1000).toISOString();

      await supabase
        .from('agent_tasks')
        .update({
          status: terminal ? 'failed' : 'retrying',
          attempt_count: nextAttempt,
          last_error: error?.message ?? 'unknown error',
          scheduled_at: terminal ? task.scheduled_at : scheduledAt,
          updated_at: new Date().toISOString(),
          run_id: runId,
        })
        .eq('id', task.id);

      if (!terminal) {
        await supabase.from('agent_tasks').update({ status: 'pending', updated_at: new Date().toISOString() }).eq('id', task.id);
      } else if (`${error?.message ?? ''}`.startsWith('NOT_IMPLEMENTED') || `${error?.message ?? ''}`.startsWith('NOT_CONFIGURED')) {
        await supabase.from('agents').update({ status: 'not_configured', updated_at: new Date().toISOString() }).eq('id', agentId);
      }

      await stub.fetch('https://state/checkpoint', {
        method: 'POST',
        body: JSON.stringify({
          ...checkpoint,
          lastRunAt: new Date().toISOString(),
          lastRunStatus: 'error',
          lastRunId: runId,
          lastTaskId: task.id,
          consecutiveFailures: (checkpoint.consecutiveFailures ?? 0) + 1,
        } satisfies AgentCheckpoint),
      });

      await saveLog(supabase, {
        runId,
        agentId,
        taskId: task.id,
        level: terminal ? 'error' : 'warn',
        message: terminal ? 'task failed permanently' : 'task scheduled for retry',
        correlationId,
        metadata: {
          error: error?.message,
          nextAttempt,
          terminal,
          retryDelay,
        },
      });
    }
  }

  await finishRun(supabase, runId, 'completed', processedTasks, insertedRecords);
  await supabase
    .from('agents')
    .update({ status: 'idle', last_run_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', agentId);
}

async function runOrchestration(env: Env, reason: 'cron' | 'manual', correlationId: string) {
  const supabase = getSupabase(env);
  const runId = crypto.randomUUID();
  await upsertRunStart(supabase, { runId, trigger: reason, correlationId });
  try {
    const { enqueued } = await enqueueAgentRuns(env, supabase, correlationId);
    await finishRun(supabase, runId, 'completed', enqueued, 0);
    return { enqueued, runId };
  } catch (error: any) {
    await finishRun(supabase, runId, 'failed', 0, 0, error?.message ?? 'orchestration failed');
    throw error;
  }
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json' } });
}

export class AgentStateDO {
  constructor(private readonly state: DurableObjectState) {}

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/checkpoint' && request.method === 'GET') {
      const checkpoint = (await this.state.storage.get<AgentCheckpoint>('checkpoint')) ?? {};
      return jsonResponse(checkpoint);
    }

    if (url.pathname === '/checkpoint' && request.method === 'POST') {
      const incoming = (await request.json()) as AgentCheckpoint;
      await this.state.storage.put('checkpoint', incoming);
      return jsonResponse({ ok: true });
    }

    return new Response('not found', { status: 404 });
  }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env): Promise<void> {
    requireRuntimeEnv(env);
    const correlationId = crypto.randomUUID();
    await env.AGENT_TASK_QUEUE.send({
      type: 'orchestrate',
      reason: 'cron',
      correlationId,
      at: new Date().toISOString(),
    } satisfies QueueEnvelope);
  },

  async queue(batch: MessageBatch<QueueEnvelope>, env: Env): Promise<void> {
    requireRuntimeEnv(env);
    for (const msg of batch.messages) {
      try {
        if (msg.body.type === 'orchestrate') {
          await runOrchestration(env, msg.body.reason, msg.body.correlationId);
        } else if (msg.body.type === 'run-agent') {
          await runAgentBatch(env, msg.body.agentId, msg.body.correlationId);
        }
        msg.ack();
      } catch (error: any) {
        jsonLog('error', 'queue handler failure', {
          error: error?.message ?? 'unknown',
          envelope: msg.body,
        });
        msg.retry();
      }
    }
  },

  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/health') {
      return jsonResponse({ status: 'ok', build: env.BUILD_VERSION ?? 'dev', date: new Date().toISOString() });
    }

    if (url.pathname === '/api/admin/orchestrate' && request.method === 'POST') {
      const unauthorized = requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const correlationId = crypto.randomUUID();
      await env.AGENT_TASK_QUEUE.send({
        type: 'orchestrate',
        reason: 'manual',
        correlationId,
        at: new Date().toISOString(),
      } satisfies QueueEnvelope);
      return jsonResponse({ accepted: true, correlationId }, 202);
    }

    if (url.pathname === '/api/admin/run-agent' && request.method === 'POST') {
      const unauthorized = requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const body = (await request.json()) as { agentId?: string };
      if (!body.agentId) return jsonResponse({ error: 'agentId is required' }, 400);
      const correlationId = crypto.randomUUID();
      await env.AGENT_TASK_QUEUE.send({
        type: 'run-agent',
        agentId: body.agentId,
        correlationId,
        enqueuedAt: new Date().toISOString(),
      } satisfies QueueEnvelope);
      return jsonResponse({ accepted: true, correlationId }, 202);
    }

    if (url.pathname === '/api/admin/metrics') {
      const unauthorized = requireAdmin(request, env);
      if (unauthorized) return unauthorized;
      const supabase = getSupabase(env);
      const [pending, retrying, failed] = await Promise.all([
        supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).eq('status', 'retrying'),
        supabase.from('agent_tasks').select('*', { count: 'exact', head: true }).eq('status', 'failed'),
      ]);

      return jsonResponse({
        pending_tasks: pending.count ?? 0,
        retrying_tasks: retrying.count ?? 0,
        failed_tasks: failed.count ?? 0,
        build: env.BUILD_VERSION ?? 'dev',
      });
    }

    return new Response('Not found', { status: 404 });
  },
};
