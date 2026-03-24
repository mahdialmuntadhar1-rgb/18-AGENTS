import { json, GOVERNOR_CONFIGS, type Env } from "../../_shared/types";
import { getSupabase } from "../../_shared/agents";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const sb = getSupabase(context.env);
  const { data: dbAgents } = await sb.from("agents").select("agent_name, status");

  // Build activeRuns from database state
  const activeRuns: Record<string, string> = {};
  for (const config of GOVERNOR_CONFIGS) {
    const db = dbAgents?.find((a: any) => a.agent_name === config.id);
    activeRuns[config.id] = db?.status || "idle";
  }

  return json({ activeRuns, configs: GOVERNOR_CONFIGS });
};
