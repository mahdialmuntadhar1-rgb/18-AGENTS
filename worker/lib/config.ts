export interface RuntimeConfig {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  adminSecret: string;
  googlePlacesApiKey?: string;
  backoffBaseSeconds: number;
  backoffMaxSeconds: number;
}

export function getConfig(env: Env): RuntimeConfig {
  if (!env.SUPABASE_URL) throw new Error('SUPABASE_URL is required');
  if (!env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');
  if (!env.ADMIN_SHARED_SECRET) throw new Error('ADMIN_SHARED_SECRET is required');

  return {
    supabaseUrl: env.SUPABASE_URL,
    supabaseServiceRoleKey: env.SUPABASE_SERVICE_ROLE_KEY,
    adminSecret: env.ADMIN_SHARED_SECRET,
    googlePlacesApiKey: env.GOOGLE_PLACES_API_KEY,
    backoffBaseSeconds: Number(env.BACKOFF_BASE_SECONDS ?? '30'),
    backoffMaxSeconds: Number(env.BACKOFF_MAX_SECONDS ?? '1800'),
  };
}
