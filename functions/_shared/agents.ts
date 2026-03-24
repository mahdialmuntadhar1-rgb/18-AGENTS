import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
import type { Env } from "./types";

// ─── Helpers ───────────────────────────────────────────────

export function getSupabase(env: Env): SupabaseClient {
  return createClient(
    env.VITE_SUPABASE_URL,
    env.SUPABASE_SERVICE_ROLE_KEY || env.VITE_SUPABASE_ANON_KEY
  );
}

function getGemini(env: Env): GoogleGenAI {
  return new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
}

function parseJSON<T = any>(raw: string): T {
  let cleaned = raw.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
  }
  return JSON.parse(cleaned);
}

async function askGemini(
  env: Env,
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const ai = getGemini(env);
  const result = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    config: { systemInstruction: systemPrompt },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
  });
  return result.text || "";
}

async function agentLog(
  sb: SupabaseClient,
  agentName: string,
  action: string,
  details?: string,
  recordId?: string
) {
  await sb.from("agent_logs").insert({
    agent_name: agentName,
    action,
    details,
    record_id: recordId,
  });
}

async function setAgentStatus(
  sb: SupabaseClient,
  agentName: string,
  category: string,
  status: string,
  extra?: Record<string, any>
) {
  await sb.from("agents").upsert(
    {
      agent_name: agentName,
      category,
      status,
      updated_at: new Date().toISOString(),
      ...(status === "active" ? { last_run: new Date().toISOString() } : {}),
      ...extra,
    },
    { onConflict: "agent_name" }
  );
}

// ─── Result type ───────────────────────────────────────────

export interface AgentResult {
  agent: string;
  governorate: string;
  status: "success" | "error" | "partial";
  recordsProcessed: number;
  recordsInserted: number;
  errors: string[];
  details: string;
}

// ─── Finder Agent ──────────────────────────────────────────

const FINDER_SYSTEM = `You are the Business Finder Agent for Iraq Compass.
Your job: Discover real Iraqi businesses for a given governorate and category.

RULES:
- Output ONLY real businesses you are confident exist. Never fabricate.
- Use your knowledge of Iraqi cities, neighborhoods, and business naming patterns.
- Include Arabic and Kurdish names when known.
- Phone format: Iraqi mobile (07XX-XXX-XXXX).
- Generate a unique business_id slug: lowercase, hyphens, e.g. "ali-restaurant-sulaymaniyah"
- confidence: "high" = very sure, "medium" = likely, "low" = possible

OUTPUT FORMAT (strict JSON array):
[
  {
    "business_id": "slug-string",
    "name": { "en": "Name", "ar": "الاسم", "ku": "ناو" },
    "category": "string",
    "subcategory": "optional",
    "city": "city name",
    "district": "area",
    "contact": { "phone": ["07XX-XXX-XXXX"], "whatsapp": "", "website": "", "instagram": "", "facebook": "" },
    "location": { "google_maps_url": "", "coordinates": { "lat": null, "lng": null }, "address": { "en": "", "ar": "", "ku": "" } },
    "sources": ["gemini-discovery"],
    "confidence": "high|medium|low",
    "verification_score": 0
  }
]`;

export async function runFinder(
  env: Env,
  governorate: string,
  category: string,
  limit: number
): Promise<AgentResult> {
  const sb = getSupabase(env);
  const agentName = "Finder Agent";
  const errors: string[] = [];
  let recordsProcessed = 0;
  let recordsInserted = 0;

  try {
    await setAgentStatus(sb, agentName, "Business Lead Discovery", "active");
    await agentLog(sb, agentName, "started", `Finding ${category} in ${governorate}, target=${limit}`);

    const raw = await askGemini(
      env,
      FINDER_SYSTEM,
      `Find ${limit} real ${category} businesses in ${governorate}, Iraq. Include names in English, Arabic, and Kurdish (Sorani) where possible. Include phone numbers, addresses, and any social media you know of.`
    );

    let results: any[];
    try {
      results = parseJSON(raw);
    } catch {
      errors.push("Failed to parse Gemini response");
      await agentLog(sb, agentName, "error", `Parse failed for ${governorate}/${category}`);
      await setAgentStatus(sb, agentName, "Business Lead Discovery", "error");
      return { agent: agentName, governorate, status: "error", recordsProcessed: 0, recordsInserted: 0, errors, details: raw.substring(0, 300) };
    }

    recordsProcessed = results.length;
    await agentLog(sb, agentName, "processing", `Gemini returned ${results.length} businesses`);

    for (const biz of results) {
      if (!biz.business_id || !biz.name) continue;

      const record = {
        business_id: biz.business_id,
        name: biz.name,
        category: biz.category || category,
        subcategory: biz.subcategory || null,
        city: biz.city || governorate,
        district: biz.district || null,
        verified: false,
        verification_score: biz.verification_score || 0,
        sources: biz.sources || ["gemini-discovery"],
        contact: biz.contact || { phone: [], whatsapp: "", website: "", instagram: "", facebook: "" },
        location: biz.location || { google_maps_url: "", coordinates: { lat: null, lng: null }, address: { en: "", ar: "", ku: "" } },
        postcard: { logo_url: "", cover_image_url: "", tagline: { en: "", ar: "", ku: "" }, description: { en: "", ar: "", ku: "" }, highlights: [] },
        agent_notes: `Discovered by ${agentName} (${biz.confidence || "medium"})`,
      };

      const { error } = await sb.from("businesses").upsert(record, { onConflict: "business_id" });
      if (error) errors.push(`${biz.business_id}: ${error.message}`);
      else recordsInserted++;
    }

    await setAgentStatus(sb, agentName, "Business Lead Discovery", "idle", { records_collected: recordsInserted });
    await agentLog(sb, agentName, "completed", `${governorate}/${category}: inserted ${recordsInserted}/${recordsProcessed}`);

    return { agent: agentName, governorate, status: errors.length ? "partial" : "success", recordsProcessed, recordsInserted, errors, details: `Discovered ${recordsInserted} ${category} in ${governorate}` };
  } catch (err: any) {
    await agentLog(sb, agentName, "error", err.message);
    await setAgentStatus(sb, agentName, "Business Lead Discovery", "error");
    return { agent: agentName, governorate, status: "error", recordsProcessed, recordsInserted, errors: [err.message], details: err.message };
  }
}

// ─── Social Scraper Agent ──────────────────────────────────

const SOCIAL_SYSTEM = `You are the Social Media Discovery Agent for Iraq Compass.
Given a list of Iraqi businesses (name, city, category), find or infer their Instagram and Facebook pages.

RULES:
- Use real naming patterns: Iraqi businesses often use their Arabic name transliterated, city name, or "official" suffix.
- Common Instagram: @businessname_iq, @businessname_sulaymaniyah, @businessname.official
- Common Facebook: facebook.com/businessname, facebook.com/businessname.iq
- ONLY output URLs/handles you are confident about. Set empty "" if unsure.
- confidence: "high" (real match), "medium" (likely), "low" (guess)
- Never fabricate follower counts.

OUTPUT FORMAT (strict JSON array):
[
  {
    "business_id": "string",
    "name_en": "string",
    "instagram": "@handle or empty",
    "instagram_url": "https://instagram.com/handle or empty",
    "facebook_url": "https://facebook.com/page or empty",
    "confidence": "high|medium|low",
    "notes": "string"
  }
]`;

export async function runSocialScraper(
  env: Env,
  governorate: string,
  limit: number,
  category?: string
): Promise<AgentResult> {
  const sb = getSupabase(env);
  const agentName = "Social Scraper";
  const errors: string[] = [];
  let recordsProcessed = 0;
  let recordsInserted = 0;

  try {
    await setAgentStatus(sb, agentName, "Instagram & Facebook Discovery", "active");
    await agentLog(sb, agentName, "started", `Social scan for ${governorate}, limit=${limit}`);

    let query = sb.from("businesses").select("*").eq("city", governorate).limit(limit);
    if (category) query = query.eq("category", category);

    const { data: businesses, error: fetchError } = await query;
    if (fetchError) throw new Error(`Fetch error: ${fetchError.message}`);
    if (!businesses || businesses.length === 0) {
      await agentLog(sb, agentName, "info", `No businesses found in ${governorate}`);
      await setAgentStatus(sb, agentName, "Instagram & Facebook Discovery", "idle");
      return { agent: agentName, governorate, status: "success", recordsProcessed: 0, recordsInserted: 0, errors: [], details: `No businesses in ${governorate}` };
    }

    recordsProcessed = businesses.length;
    await agentLog(sb, agentName, "processing", `Found ${businesses.length} businesses to scan`);

    const bizList = businesses.map((b: any) => ({
      business_id: b.business_id || b.id,
      name_en: b.name?.en || b.name || "Unknown",
      name_ar: b.name?.ar || "",
      category: b.category,
      city: governorate,
      existing_instagram: b.contact?.instagram || "",
      existing_facebook: b.contact?.facebook || "",
    }));

    const raw = await askGemini(env, SOCIAL_SYSTEM, `Find Instagram and Facebook pages for these ${governorate} businesses:\n\n${JSON.stringify(bizList, null, 2)}`);

    let results: any[];
    try {
      results = parseJSON(raw);
    } catch {
      errors.push("Failed to parse Gemini response");
      await agentLog(sb, agentName, "error", `Parse failed for ${governorate}`);
      await setAgentStatus(sb, agentName, "Instagram & Facebook Discovery", "error");
      return { agent: agentName, governorate, status: "error", recordsProcessed, recordsInserted: 0, errors, details: raw.substring(0, 300) };
    }

    for (const result of results) {
      if (!result.business_id) continue;
      const existing = businesses.find((b: any) => (b.business_id || b.id) === result.business_id);
      if (!existing) continue;

      const mergedContact = {
        ...(existing.contact || {}),
        instagram: result.instagram || result.instagram_url || existing.contact?.instagram || "",
        facebook: result.facebook_url || existing.contact?.facebook || "",
      };

      const { error } = await sb.from("businesses").update({
        contact: mergedContact,
        agent_notes: `Social scan (${result.confidence}): ${result.notes || ""}`,
      }).eq("id", existing.id);

      if (error) errors.push(`${result.name_en}: ${error.message}`);
      else {
        recordsInserted++;
        await agentLog(sb, agentName, "updated", `${result.name_en}: IG=${result.instagram || "none"}, FB=${result.facebook_url || "none"}`, existing.id);
      }
    }

    await setAgentStatus(sb, agentName, "Instagram & Facebook Discovery", "idle", { records_collected: recordsInserted });
    await agentLog(sb, agentName, "completed", `${governorate}: ${recordsInserted}/${recordsProcessed} updated with social links`);

    return { agent: agentName, governorate, status: errors.length ? "partial" : "success", recordsProcessed, recordsInserted, errors, details: `Social profiles for ${recordsInserted}/${recordsProcessed} in ${governorate}` };
  } catch (err: any) {
    await agentLog(sb, agentName, "error", err.message);
    await setAgentStatus(sb, agentName, "Instagram & Facebook Discovery", "error");
    return { agent: agentName, governorate, status: "error", recordsProcessed, recordsInserted, errors: [err.message], details: err.message };
  }
}

// ─── Run Governor (combines Finder + Social) ───────────────

export async function runGovernorCF(
  env: Env,
  governorate: string,
  taskType: "find" | "social" | "both",
  category: string,
  limit: number
): Promise<AgentResult[]> {
  const results: AgentResult[] = [];

  if (taskType === "find" || taskType === "both") {
    results.push(await runFinder(env, governorate, category, limit));
  }

  if (taskType === "social" || taskType === "both") {
    results.push(await runSocialScraper(env, governorate, limit, category));
  }

  return results;
}
