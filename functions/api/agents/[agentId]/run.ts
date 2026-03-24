import { json, resolveConfig, type Env } from "../../../_shared/types";
import { runGovernorCF } from "../../../_shared/agents";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const agentId = context.params.agentId as string;
  const body = await context.request.json().catch(() => ({})) as any;
  const { taskType = "both", category, limit = 15 } = body;

  const config = resolveConfig(agentId);
  if (!config) {
    return json({ error: `Agent "${agentId}" not found` }, 404);
  }

  // Run in background
  context.waitUntil(
    runGovernorCF(
      context.env,
      config.governorate,
      taskType as "find" | "social" | "both",
      category || config.category,
      limit
    ).catch((err) => console.error(`Agent ${agentId} error:`, err))
  );

  return json({
    status: "started",
    agentId: config.id,
    governorate: config.governorate,
    taskType,
  });
};
