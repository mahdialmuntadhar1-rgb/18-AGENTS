import { json, GOVERNOR_CONFIGS, type Env } from "../_shared/types";
import { getSupabase } from "../_shared/agents";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const sb = getSupabase(context.env);

  const { count: totalBusinesses } = await sb
    .from("businesses")
    .select("*", { count: "exact", head: true });

  const { count: verifiedCount } = await sb
    .from("businesses")
    .select("*", { count: "exact", head: true })
    .eq("verified", true);

  return json({
    totalBusinesses: totalBusinesses || 0,
    verifiedCount: verifiedCount || 0,
    governorates: GOVERNOR_CONFIGS.length,
  });
};
