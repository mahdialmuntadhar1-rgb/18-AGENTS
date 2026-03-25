import { runGovernor } from "./governors/index.js";
import { supabaseAdmin } from "./supabase-admin.js";

const WORKER_STAGGER_MS = 2000;
const QC_DELAY_MS = 5000;
const QC_OVERSEER_NAME = "QC Overseer";

/**
 * The "Master Switch" logic for COPDEX.
 * Staggers worker startup to stay under LLM API limits.
 */
export async function runAllGovernors() {
  const { data: agents, error } = await supabaseAdmin
    .from("agents")
    .select("agent_name")
    .neq("agent_name", QC_OVERSEER_NAME);

  if (error || !agents) {
    console.error("COPDEX: Could not fetch agent list for orchestration.", error);
    return;
  }

  console.log(`COPDEX: Initializing ${agents.length} agents...`);

  for (const [index, agent] of agents.entries()) {
    setTimeout(async () => {
      const lastRun = new Date().toISOString();
      console.log(`[${lastRun}] Launching Agent: ${agent.agent_name}`);

      await supabaseAdmin
        .from("agents")
        .update({ status: "active", last_run: lastRun })
        .eq("agent_name", agent.agent_name);

      runGovernor(agent.agent_name).catch((err) => {
        console.error(`Agent ${agent.agent_name} failed:`, err);
      });
    }, index * WORKER_STAGGER_MS);
  }

  setTimeout(() => {
    runGovernor(QC_OVERSEER_NAME).catch((err) => {
      console.error(`Agent ${QC_OVERSEER_NAME} failed:`, err);
    });
  }, agents.length * WORKER_STAGGER_MS + QC_DELAY_MS);
}
