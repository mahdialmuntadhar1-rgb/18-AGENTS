interface Queue<T = unknown> {
  send(body: T): Promise<void>;
}

interface QueueMessage<T = unknown> {
  body: T;
  ack(): void;
  retry(): void;
}

interface MessageBatch<T = unknown> {
  messages: QueueMessage<T>[];
}

interface ScheduledController {
  cron: string;
  scheduledTime: number;
}

interface DurableObjectState {
  storage: {
    put<T>(key: string, value: T): Promise<void>;
    get<T>(key: string): Promise<T | undefined>;
  };
}

interface DurableObjectStub {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface DurableObjectId {}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  ADMIN_SHARED_SECRET: string;
  GOOGLE_PLACES_API_KEY?: string;
  BACKOFF_BASE_SECONDS?: string;
  BACKOFF_MAX_SECONDS?: string;
  AGENT_TASK_QUEUE: Queue<{ type: string; agentId?: string }>;
  AGENT_STATE_DO: DurableObjectNamespace;
}
