import { createClient } from '@supabase/supabase-js';
import type { Env } from '../worker';

export interface LogEvent {
  type: 'info' | 'ok' | 'error' | 'agent';
  message: string;
  city?: string;
  count?: number;
  timestamp: string;
}

type BusinessRecord = Record<string, any>;

const EXPORT_SUPABASE_URL = 'https://hsadukhmcclwixuntqwu.supabase.co';

function nowIso() {
  return new Date().toISOString();
}

function logEvent(type: LogEvent['type'], message: string, city?: string, count?: number): LogEvent {
  return { type, message, city, count, timestamp: nowIso() };
}

function createSupabase(env: Env) {
  return createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function createExportSupabase(env: Env) {
  const exportKey = env.EXPORT_SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY;
  return createClient(EXPORT_SUPABASE_URL, exportKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function cleanJsonEnvelope(raw: string): string {
  return raw.replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
}

async function callGeminiJson<T>(env: Env, prompt: string): Promise<T> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    },
  );

  if (!response.ok) {
    throw new Error(`Gemini API error ${response.status}: ${await response.text()}`);
  }

  const payload = (await response.json()) as any;
  const text = payload?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text || typeof text !== 'string') {
    throw new Error('Gemini response did not contain text content.');
  }

  return JSON.parse(cleanJsonEnvelope(text)) as T;
}

function pickBusinessName(record: BusinessRecord): string {
  const name = record.name ?? {};
  return name?.en || name?.ar || name?.ku || record.business_id || 'unknown';
}

function isMojibake(value: string): boolean {
  return /[ØÙ]/.test(value);
}

async function *runPerCity(
  env: Env,
  cities: string[],
  loader: (city: string) => Promise<BusinessRecord[]>,
  processor: (city: string, record: BusinessRecord) => Promise<LogEvent[]>,
): AsyncGenerator<LogEvent> {
  for (const city of cities) {
    try {
      const records = await loader(city);
      yield logEvent('info', `Loaded ${records.length} records from ${city}`, city, records.length);

      for (const record of records) {
        const events = await processor(city, record);
        for (const event of events) {
          yield event;
        }
      }
    } catch (error: any) {
      yield logEvent('error', `Error: ${error?.message ?? 'Unknown error'}`, city);
    }
  }
}

export async function *runTextRepair(env: Env, cities: string[]): AsyncGenerator<LogEvent> {
  const supabase = createSupabase(env);

  yield* runPerCity(
    env,
    cities,
    async (city) => {
      const { data, error } = await supabase.from('businesses').select('business_id,name,city').eq('city', city).limit(300);
      if (error) throw new Error(error.message);
      return (data ?? []).filter((row) => isMojibake(String(row?.name?.ar ?? '')));
    },
    async (city, record) => {
      const businessName = pickBusinessName(record);
      const fixed = await callGeminiJson<{ name_ar: string; name_ku: string; name_en: string }>(
        env,
        `Fix this corrupted Arabic/Kurdish business name and return only JSON {"name_ar":"","name_ku":"","name_en":""}. Input name JSON: ${JSON.stringify(record.name ?? {})}`,
      );

      const events: LogEvent[] = [logEvent('agent', `Gemini processed: ${businessName}`, city)];
      const nextName = {
        ...(record.name ?? {}),
        ar: String(fixed.name_ar ?? '').trim(),
        ku: String(fixed.name_ku ?? '').trim(),
        en: String(fixed.name_en ?? '').trim(),
      };

      const { error } = await supabase.from('businesses').update({ name: nextName, updated_at: nowIso() }).eq('business_id', record.business_id);
      if (error) {
        events.push(logEvent('error', `Error: ${error.message}`, city));
      } else {
        events.push(logEvent('ok', `✔ Written to Supabase: ${businessName}`, city));
      }
      return events;
    },
  );
}

export async function *runEnrichment(env: Env, cities: string[]): AsyncGenerator<LogEvent> {
  const supabase = createSupabase(env);

  yield* runPerCity(
    env,
    cities,
    async (city) => {
      const { data, error } = await supabase
        .from('businesses')
        .select('business_id,name,city,category,subcategory,contact')
        .eq('city', city)
        .limit(300);
      if (error) throw new Error(error.message);
      return (data ?? []).filter((row) => {
        const phone = row?.contact?.phone;
        const emptyPhone = !Array.isArray(phone) || phone.length === 0;
        return emptyPhone || !row.category;
      });
    },
    async (city, record) => {
      const businessName = pickBusinessName(record);
      const enriched = await callGeminiJson<{ phone: string; category: string; subcategory: string }>(
        env,
        `For this Iraqi business named ${businessName} in ${city}, suggest phone format, most likely category, subcategory. Return JSON only with keys phone, category, subcategory.`,
      );

      const events: LogEvent[] = [logEvent('agent', `Gemini processed: ${businessName}`, city)];
      const contact = record.contact ?? {};
      const nextPhone = String(enriched.phone ?? '').trim();
      const nextContact = {
        ...contact,
        phone: nextPhone ? [nextPhone] : (Array.isArray(contact.phone) ? contact.phone : []),
      };

      const { error } = await supabase
        .from('businesses')
        .update({
          contact: nextContact,
          category: String(enriched.category ?? '').trim() || record.category,
          subcategory: String(enriched.subcategory ?? '').trim() || record.subcategory,
          updated_at: nowIso(),
        })
        .eq('business_id', record.business_id);

      if (error) events.push(logEvent('error', `Error: ${error.message}`, city));
      else events.push(logEvent('ok', `✔ Written to Supabase: ${businessName}`, city));
      return events;
    },
  );
}

export async function *runSocialFinder(env: Env, cities: string[]): AsyncGenerator<LogEvent> {
  const supabase = createSupabase(env);

  yield* runPerCity(
    env,
    cities,
    async (city) => {
      const { data, error } = await supabase.from('businesses').select('business_id,name,city,contact').eq('city', city).limit(300);
      if (error) throw new Error(error.message);
      return (data ?? []).filter((row) => !String(row?.contact?.instagram ?? '').trim());
    },
    async (city, record) => {
      const businessName = pickBusinessName(record);
      const socials = await callGeminiJson<{ instagram: string; facebook: string }>(
        env,
        `Search for the Instagram and Facebook page for this Iraqi business: ${businessName} in ${city}. Return JSON: {"instagram":"url_or_empty","facebook":"url_or_empty"}. If unknown, return empty string.`,
      );

      const events: LogEvent[] = [logEvent('agent', `Gemini processed: ${businessName}`, city)];
      const contact = record.contact ?? {};
      const instagram = String(socials.instagram ?? '').trim();
      const facebook = String(socials.facebook ?? '').trim();
      const foundCount = Number(Boolean(instagram)) + Number(Boolean(facebook));

      const { error } = await supabase
        .from('businesses')
        .update({ contact: { ...contact, instagram, facebook }, updated_at: nowIso() })
        .eq('business_id', record.business_id);

      if (error) {
        events.push(logEvent('error', `Error: ${error.message}`, city));
      } else {
        events.push(logEvent('ok', `✔ Written to Supabase: ${businessName}`, city));
        events.push(logEvent('info', `Found ${foundCount} social profiles for ${businessName}`, city, foundCount));
      }
      return events;
    },
  );
}

export async function *runQualityCheck(env: Env, cities: string[]): AsyncGenerator<LogEvent> {
  const supabase = createSupabase(env);

  yield* runPerCity(
    env,
    cities,
    async (city) => {
      const { data, error } = await supabase
        .from('businesses')
        .select('business_id,name,city,category,contact,location,verified')
        .eq('city', city)
        .eq('verified', false)
        .limit(300);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    async (city, record) => {
      const businessName = pickBusinessName(record);
      const scoreResult = await callGeminiJson<{ score: number; flags: string[] }>(
        env,
        `Score this Iraqi business record from 0-100 for data quality. Consider Arabic/Kurdish name, phone, address, category. Return JSON only: {"score": number, "flags": ["..."]}. Record: ${JSON.stringify(record)}`,
      );

      const events: LogEvent[] = [logEvent('agent', `Gemini processed: ${businessName}`, city)];
      const score = Number(scoreResult.score ?? 0);
      const flags = Array.isArray(scoreResult.flags) ? scoreResult.flags : [];

      const { error } = await supabase
        .from('businesses')
        .update({
          verification_score: score,
          agent_notes: `quality_flags: ${flags.join(', ')}`,
          verified: score >= 60,
          verification_status: score >= 60 ? 'verified' : 'needs_review',
          last_verified: nowIso(),
          updated_at: nowIso(),
        })
        .eq('business_id', record.business_id);

      if (error) {
        events.push(logEvent('error', `Error: ${error.message}`, city));
      } else {
        events.push(logEvent('ok', `✔ Written to Supabase: ${businessName}`, city));
        events.push(logEvent('info', `Quality score ${score} for ${businessName}`, city, score));
      }
      return events;
    },
  );
}

export async function *runExport(env: Env, cities: string[]): AsyncGenerator<LogEvent> {
  const source = createSupabase(env);
  const target = createExportSupabase(env);

  yield* runPerCity(
    env,
    cities,
    async (city) => {
      const { data, error } = await source.from('businesses').select('*').eq('city', city).limit(2000);
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    async (city, record) => {
      const businessName = pickBusinessName(record);
      const events: LogEvent[] = [logEvent('agent', `Gemini processed: ${businessName}`, city)];

      const { error } = await target.from('businesses').upsert({ ...record, updated_at: nowIso() }, { onConflict: 'business_id' });
      if (error) events.push(logEvent('error', `Error: ${error.message}`, city));
      else events.push(logEvent('ok', `✔ Written to Supabase: ${businessName}`, city));
      return events;
    },
  );
}

function toBusinessInsertRecord(record: any, city: string, category: string) {
  const businessId = crypto.randomUUID();
  return {
    business_id: businessId,
    name: {
      ku: String(record.name_ku ?? '').trim(),
      ar: String(record.name_ar ?? '').trim(),
      en: String(record.name_en ?? '').trim(),
    },
    city,
    district: String(record.district ?? '').trim(),
    category: String(record.category ?? '').trim() || category,
    subcategory: String(record.subcategory ?? '').trim(),
    contact: {
      phone: record.phone ? [String(record.phone).trim()] : [],
      website: String(record.website ?? '').trim(),
      instagram: '',
      facebook: '',
    },
    location: {
      address: {
        en: String(record.address ?? '').trim(),
        ar: String(record.address ?? '').trim(),
        ku: String(record.address ?? '').trim(),
      },
      coordinates: { lat: null, lng: null },
    },
    postcard: {
      description: {
        en: String(record.description ?? '').trim(),
        ar: String(record.description ?? '').trim(),
        ku: String(record.description ?? '').trim(),
      },
      logo_url: '',
      cover_image_url: '',
    },
    sources: ['gemini_collect'],
    created_by_agent: 'collect',
    verification_status: 'pending',
    verified: false,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
}

export async function *runCollect(env: Env, cities: string[], category: string): AsyncGenerator<LogEvent> {
  const supabase = createSupabase(env);

  for (const city of cities) {
    try {
      const prompt = `Generate 20 real Iraqi businesses in ${city} in the category ${category}. Return JSON array with fields: name_ku, name_ar, name_en, phone, address, district, city, governorate, category, subcategory, website, description.`;
      const generated = await callGeminiJson<any[]>(env, prompt);
      const records = Array.isArray(generated) ? generated : [];
      yield logEvent('info', `Loaded ${records.length} records from ${city}`, city, records.length);

      const inserts = records.map((record) => toBusinessInsertRecord(record, city, category));
      for (const row of inserts) {
        const businessName = pickBusinessName(row);
        yield logEvent('agent', `Gemini processed: ${businessName}`, city);
        const { error } = await supabase.from('businesses').insert(row);
        if (error) {
          yield logEvent('error', `Error: ${error.message}`, city);
        } else {
          yield logEvent('ok', `✔ Written to Supabase: ${businessName}`, city);
        }
      }

      yield logEvent('info', `Inserted ${inserts.length} records for ${city}`, city, inserts.length);
    } catch (error: any) {
      yield logEvent('error', `Error: ${error?.message ?? 'Unknown error'}`, city);
    }
  }
}

export async function *runAgent(env: Env, taskType: string, cities: string[], instruction: string): AsyncGenerator<LogEvent> {
  const normalized = taskType.toLowerCase();

  if (normalized === 'text_repair' || normalized === 'text') {
    yield* runTextRepair(env, cities);
    return;
  }
  if (normalized === 'enrich') {
    yield* runEnrichment(env, cities);
    return;
  }
  if (normalized === 'social') {
    yield* runSocialFinder(env, cities);
    return;
  }
  if (normalized === 'quality_check' || normalized === 'qc') {
    yield* runQualityCheck(env, cities);
    return;
  }
  if (normalized === 'export') {
    yield* runExport(env, cities);
    return;
  }
  if (normalized === 'collect') {
    const category = instruction?.trim() || 'General';
    yield* runCollect(env, cities, category);
    return;
  }

  yield logEvent('error', `Unknown task type: ${taskType}`);
}
