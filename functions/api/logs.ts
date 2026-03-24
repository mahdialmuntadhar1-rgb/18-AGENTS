import { json, type Env } from "../_shared/types";
import { getSupabase } from "../_shared/agents";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url);
  const limit = parseInt(url.searchParams.get("limit") || "50");
  const sb = getSupabase(context.env);

  const { data, error } = await sb
    .from("agent_logs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return json({ error: error.message }, 500);
  return json(data);
};
