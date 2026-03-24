import { GOVERNOR_CONFIGS, json, type Env } from "../_shared/types";

export const onRequestGet: PagesFunction<Env> = async (context) => {
  return json({
    status: "ok",
    gemini: !!context.env.GEMINI_API_KEY,
    governors: GOVERNOR_CONFIGS.length,
  });
};
