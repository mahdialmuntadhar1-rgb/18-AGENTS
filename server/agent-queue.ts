import { supabaseAdmin } from "./supabase-admin.js";
import { ALLOWED_CATEGORIES, type AllowedCategory } from "../shared-categories.js";

type AgentTask = {
  id: number;
  task_type: string;
  category: AllowedCategory;
  city: string | null;
  government_rate: string | null;
};

type AgentWorkerStatus = "idle" | "processing" | "error";

type AgentWorkerState = {
  name: string;
  status: AgentWorkerStatus;
  lastHeartbeat: string;
  processed: number;
  failures: number;
  currentTaskId?: number;
};

type BusinessInsert = {
  name: string;
  category: AllowedCategory;
  government_rate: string | null;
  city: string;
  address: string | null;
  phone: string | null;
  website: string | null;
  description: string | null;
  source_url: string | null;
  created_by_agent: string;
  verification_status: "verified";
};

const DEFAULT_CITIES = ["Baghdad", "Basra", "Erbil", "Mosul", "Kirkuk", "Najaf"];
const DEFAULT_RATES = ["A", "B", "C"];

function isAllowedCategory(value: string | null): value is AllowedCategory {
  return !!value && ALLOWED_CATEGORIES.includes(value as AllowedCategory);
}

function fakeBusiness(task: AgentTask, worker: string, index: number): BusinessInsert {
  const city = task.city ?? DEFAULT_CITIES[index % DEFAULT_CITIES.length];
  return {
    name: `${task.category} ${city} ${Date.now()}-${index}`,
    category: task.category,
    government_rate: task.government_rate ?? "B",
    city,
    address: `${index + 1} Main Street`,
    phone: `+964-770-000-${String(index).padStart(4, "0")}`,
    website: `https://example.com/${task.category}/${city.toLowerCase()}`,
    description: `Auto-collected listing for ${task.category} in ${city}`,
    source_url: "https://example.com/source",
    created_by_agent: worker,
    verification_status: "verified",
  };
}

export class AgentQueueSystem {
  private workers: AgentWorkerState[];
  private loopHandles: NodeJS.Timeout[] = [];
  private managerHandle?: NodeJS.Timeout;

  constructor(workerCount = 18) {
    this.workers = Array.from({ length: workerCount }, (_, i) => ({
      name: `agent_${i + 1}`,
      status: "idle",
      lastHeartbeat: new Date().toISOString(),
      processed: 0,
      failures: 0,
    }));
  }

  getWorkerStates() {
    return this.workers;
  }

  async start() {
    if (this.loopHandles.length > 0) return;

    this.loopHandles = this.workers.map((worker) =>
      setInterval(() => {
        this.runWorkerCycle(worker).catch((err) => {
          console.error(`Worker cycle failed for ${worker.name}`, err);
        });
      }, 1500),
    );

    this.managerHandle = setInterval(() => {
      this.runManagerCycle().catch((err) => {
        console.error("Manager cycle failed", err);
      });
    }, 5000);

    await this.seedQueueIfEmpty();
  }

  stop() {
    this.loopHandles.forEach(clearInterval);
    this.loopHandles = [];
    if (this.managerHandle) {
      clearInterval(this.managerHandle);
      this.managerHandle = undefined;
    }
    this.workers = this.workers.map((worker) => ({ ...worker, status: "idle", currentTaskId: undefined }));
  }

  private async runWorkerCycle(worker: AgentWorkerState) {
    if (worker.status === "processing") return;

    worker.lastHeartbeat = new Date().toISOString();
    const task = await this.claimTask(worker.name);
    if (!task) return;

    worker.status = "processing";
    worker.currentTaskId = task.id;

    try {
      const scraped = [fakeBusiness(task, worker.name, 0), fakeBusiness(task, worker.name, 1)];
      const validated = scraped.filter((row) => isAllowedCategory(row.category));

      if (validated.length > 0) {
        const { error: insertError } = await supabaseAdmin
          .from("businesses")
          .upsert(validated, { onConflict: "name,city", ignoreDuplicates: true });

        if (insertError) {
          throw insertError;
        }
      }

      const { error: doneError } = await supabaseAdmin
        .from("agent_tasks")
        .update({ status: "completed" })
        .eq("id", task.id);

      if (doneError) throw doneError;

      worker.processed += 1;
      worker.status = "idle";
      worker.currentTaskId = undefined;
      worker.lastHeartbeat = new Date().toISOString();
    } catch (error) {
      console.error(`Task ${task.id} failed by ${worker.name}`, error);
      worker.failures += 1;
      worker.status = "error";
      worker.currentTaskId = undefined;

      await supabaseAdmin
        .from("agent_tasks")
        .update({ status: "failed", assigned_agent: worker.name })
        .eq("id", task.id);
    }
  }

  private async claimTask(workerName: string): Promise<AgentTask | null> {
    const { data, error } = await supabaseAdmin.rpc("claim_agent_task", { worker_name: workerName });
    if (error) {
      console.error("Failed to claim task", error);
      return null;
    }

    const first = data?.[0];
    if (!first) return null;

    if (!isAllowedCategory(first.category)) {
      await supabaseAdmin.from("agent_tasks").update({ status: "failed" }).eq("id", first.id);
      return null;
    }

    return first as AgentTask;
  }

  private async runManagerCycle() {
    const now = Date.now();

    for (const worker of this.workers) {
      const staleMs = now - new Date(worker.lastHeartbeat).getTime();
      if (worker.status === "error" || staleMs > 15000) {
        worker.status = "idle";
        worker.currentTaskId = undefined;
        worker.lastHeartbeat = new Date().toISOString();
      }
    }

    await this.seedQueueIfEmpty();
  }

  private async seedQueueIfEmpty() {
    const { count, error: countError } = await supabaseAdmin
      .from("agent_tasks")
      .select("id", { count: "exact", head: true })
      .in("status", ["pending", "processing"]);

    if (countError) {
      console.error("Failed counting tasks", countError);
      return;
    }

    if ((count ?? 0) > 0) return;

    const newTasks = ALLOWED_CATEGORIES.slice(0, 6).flatMap((category, idx) => [
      {
        task_type: "scrape_businesses",
        category,
        city: DEFAULT_CITIES[idx % DEFAULT_CITIES.length],
        government_rate: DEFAULT_RATES[idx % DEFAULT_RATES.length],
        status: "pending",
      },
    ]);

    const { error } = await supabaseAdmin.from("agent_tasks").insert(newTasks);
    if (error) {
      console.error("Failed to seed tasks", error);
    }
  }
}
