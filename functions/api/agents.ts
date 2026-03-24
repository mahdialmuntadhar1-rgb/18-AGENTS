import { json, GOVERNOR_CONFIGS, type Env } from "../_shared/types";
import { getSupabase } from "../_shared/agents";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const sb = getSupabase(context.env);
  const { data: dbAgents } = await sb.from("agents").select("*");

  const merged = GOVERNOR_CONFIGS.map((config) => {
    const db = dbAgents?.find((a: any) => a.agent_name === config.id);
    return {
      name: config.id,
      governorate: config.governorate,
      category: config.category,
      rate: config.rate,
      status: db?.status || "idle",
      recordsCollected: db?.records_collected || 0,
      target: db?.target || 1000,
      errors: db?.errors || 0,
      lastRun: db?.last_run || null,
    };
  });

  return json(merged);
};
