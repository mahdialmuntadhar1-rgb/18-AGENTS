import { json, GOVERNOR_CONFIGS, type Env } from "../../_shared/types";
import { runGovernorCF } from "../../_shared/agents";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const body = await context.request.json().catch(() => ({})) as any;
  const { taskType = "both", category, limit = 10 } = body;

  // Run ALL 18 governors in background
  context.waitUntil(
    (async () => {
      for (const config of GOVERNOR_CONFIGS) {
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

  return json({ status: "started", count: GOVERNOR_CONFIGS.length });
};
