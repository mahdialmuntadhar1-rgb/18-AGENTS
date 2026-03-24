import { json, GOVERNOR_CONFIGS, resolveConfig, type Env } from "../../_shared/types";
import { runGovernorCF } from "../../_shared/agents";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json().catch(() => ({})) as any;
  const { governorates, taskType = "both", category, limit = 15 } = body;

  if (!governorates || !Array.isArray(governorates) || governorates.length === 0) {
    return json({ error: "Provide governorates[] array" }, 400);
  }

  // Resolve governorate names to configs
  const configs = governorates
    .map((g: string) => resolveConfig(g))
    .filter(Boolean);

  if (configs.length === 0) {
    return json({ error: "No matching governors found" }, 400);
  }

  // Run agents in background using waitUntil (returns immediately)
  context.waitUntil(
    (async () => {
      for (const config of configs) {
        if (!config) continue;
        try {
          await runGovernorCF(
            context.env,
            config.governorate,
            taskType as "find" | "social" | "both",
            category || config.category,
            limit
          );
        } catch (err) {
          console.error(`Governor ${config.id} error:`, err);
        }
      }
    })()
  );

  return json({
    status: "started",
    agents: configs.map((c: any) => c.id),
    taskType,
  });
};
