import { json, resolveConfig, type Env } from "../../../_shared/types";
import { getSupabase } from "../../../_shared/agents";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const agentId = context.params.agentId as string;
  const config = resolveConfig(agentId);

  if (!config) {
    return json({ error: `Agent "${agentId}" not found` }, 404);
  }

  const sb = getSupabase(context.env);
  await sb
    .from("agents")
    .update({ status: "idle", updated_at: new Date().toISOString() })
    .eq("agent_name", config.id);

  return json({ status: "stopping", agentId: config.id });
};
