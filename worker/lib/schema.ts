export type AgentStatus = 'idle' | 'running' | 'not_configured' | 'error';
export type TaskStatus = 'pending' | 'processing' | 'retrying' | 'completed' | 'failed';
export type RunStatus = 'running' | 'completed' | 'failed' | 'not_configured';
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface Agent {
  id: string;
  display_name: string;
  governorate_id: string | null;
  city: string;
  category: string;
  government_rate: string | null;
  connector: string;
  status: AgentStatus;
  status_reason: string | null;
}

export interface AgentTask {
  id: number;
  agent_id: string;
  governorate_id: string | null;
  city: string;
  category: string;
  government_rate: string | null;
  payload: Record<string, unknown>;
  status: TaskStatus;
  attempt_count: number;
  max_attempts: number;
  correlation_id: string | null;
}

export interface BusinessUpsert {
  governorate_id?: string | null;
  external_id?: string | null;
  name: string;
  category: string;
  city: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  rating?: number | null;
  review_count?: number | null;
  source: string;
  source_url?: string | null;
  source_hash: string;
  raw_payload: unknown;
  collected_at: string;
  created_by_agent_id?: string;
  updated_by_agent_id?: string;
  last_task_id?: number;
}

export interface ProviderBusiness {
  externalId?: string;
  name: string;
  category: string;
  city: string;
  address?: string;
  phone?: string;
  website?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  reviewCount?: number;
  sourceUrl?: string;
  rawPayload: unknown;
}
