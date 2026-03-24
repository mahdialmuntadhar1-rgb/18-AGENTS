/** Environment variables available in Cloudflare Pages Functions */
export interface Env {
  VITE_SUPABASE_URL: string;
  VITE_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  GEMINI_API_KEY: string;
  GOOGLE_PLACES_API_KEY?: string;
}

export interface GovernorConfig {
  id: string;
  governorate: string;
  category: string;
  rate: string;
}

export const GOVERNOR_CONFIGS: GovernorConfig[] = [
  { id: "Agent-01", governorate: "Baghdad",       category: "restaurants",     rate: "Rate Level 1" },
  { id: "Agent-02", governorate: "Basra",         category: "cafes",           rate: "Rate Level 1" },
  { id: "Agent-03", governorate: "Nineveh",       category: "bakeries",        rate: "Rate Level 1" },
  { id: "Agent-04", governorate: "Erbil",         category: "hotels",          rate: "Rate Level 1" },
  { id: "Agent-05", governorate: "Sulaymaniyah",  category: "gyms",            rate: "Rate Level 2" },
  { id: "Agent-06", governorate: "Kirkuk",        category: "beauty_salons",   rate: "Rate Level 2" },
  { id: "Agent-07", governorate: "Duhok",         category: "barbershops",     rate: "Rate Level 2" },
  { id: "Agent-08", governorate: "Anbar",         category: "pharmacies",      rate: "Rate Level 2" },
  { id: "Agent-09", governorate: "Babil",         category: "supermarkets",    rate: "Rate Level 3" },
  { id: "Agent-10", governorate: "Karbala",       category: "electronics",     rate: "Rate Level 3" },
  { id: "Agent-11", governorate: "Wasit",         category: "clothing_stores", rate: "Rate Level 3" },
  { id: "Agent-12", governorate: "Dhi Qar",       category: "car_services",    rate: "Rate Level 3" },
  { id: "Agent-13", governorate: "Maysan",        category: "dentists",        rate: "Rate Level 4" },
  { id: "Agent-14", governorate: "Muthanna",      category: "clinics",         rate: "Rate Level 4" },
  { id: "Agent-15", governorate: "Najaf",         category: "schools",         rate: "Rate Level 4" },
  { id: "Agent-16", governorate: "Qadisiyyah",    category: "coworking",       rate: "Rate Level 5" },
  { id: "Agent-17", governorate: "Saladin",       category: "entertainment",   rate: "Rate Level 5" },
  { id: "Agent-18", governorate: "Diyala",        category: "tourism",         rate: "Rate Level 5" },
];

export function resolveConfig(agentIdOrGov: string): GovernorConfig | undefined {
  return (
    GOVERNOR_CONFIGS.find((c) => c.id === agentIdOrGov) ||
    GOVERNOR_CONFIGS.find((c) => c.governorate.toLowerCase() === agentIdOrGov.toLowerCase())
  );
}

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
