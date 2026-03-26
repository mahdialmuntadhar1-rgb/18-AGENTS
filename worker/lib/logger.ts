import type { RuntimeDb } from './db';
import type { LogLevel } from './schema';

export async function logRuntime(
  db: RuntimeDb,
  level: LogLevel,
  message: string,
  correlationId: string,
  context: { runId?: string; agentId: string; taskId?: number; details?: unknown },
): Promise<void> {
  console[level === 'debug' ? 'log' : level](`[${correlationId}] ${context.agentId}: ${message}`);
  await db.log(level, message, correlationId, context);
}
