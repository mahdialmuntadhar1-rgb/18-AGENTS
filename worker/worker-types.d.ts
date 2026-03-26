interface Queue {
  send(message: unknown): Promise<void>;
}

interface QueueMessage<T> {
  body: T;
  ack(): void;
  retry(): void;
}

interface MessageBatch<T> {
  messages: Array<QueueMessage<T>>;
}

interface ScheduledEvent {}

interface ExecutionContext {}

interface DurableObjectStorage {
  get<T = unknown>(key: string): Promise<T | undefined>;
  put(key: string, value: unknown): Promise<void>;
}

interface DurableObjectState {
  storage: DurableObjectStorage;
}

interface DurableObjectStub {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}

interface DurableObjectNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

interface DurableObjectId {}
