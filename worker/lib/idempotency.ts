import type { AgentTask, ProviderBusiness } from './schema';

function canonical(parts: Array<string | number | null | undefined>): string {
  return parts.map((part) => (part ?? '').toString().trim().toLowerCase()).join('|');
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export async function buildTaskIdempotencyKey(task: Pick<AgentTask, 'agent_id' | 'city' | 'category'>): Promise<string> {
  return sha256Hex(canonical([task.agent_id, task.city, task.category]));
}

export async function buildBusinessSourceHash(agentId: string, item: ProviderBusiness): Promise<string> {
  return sha256Hex(canonical([agentId, item.externalId, item.name, item.city, item.sourceUrl]));
}

export function computeBackoffSeconds(attemptCount: number, baseSeconds: number, maxSeconds: number): number {
  const exp = Math.min(baseSeconds * 2 ** Math.max(attemptCount - 1, 0), maxSeconds);
  const jitter = 0.8 + Math.random() * 0.4;
  return Math.round(exp * jitter);
}
