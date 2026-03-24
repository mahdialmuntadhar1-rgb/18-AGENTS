import { json, GOVERNOR_CONFIGS, type Env } from "../../_shared/types";
import { getSupabase } from "../../_shared/agents";

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const sb = getSupabase(context.env);

  // Set all active agents to idle in Supabase
  await sb
    .from("agents")
    .update({ status: "idle", updated_at: new Date().toISOString() })
    .eq("status", "active");

  return json({ status: "stopping" });
};
