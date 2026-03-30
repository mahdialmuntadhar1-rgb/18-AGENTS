import { NormalizedBusiness, SearchInput, SourceName } from "../domain/business.js";

export function makeBaseBusiness(source: SourceName, input: SearchInput, name: string): NormalizedBusiness {
  const now = new Date().toISOString();
  return {
    name,
    category: input.category,
    city: input.city,
    governorate: input.governorate,
    country: "Iraq",
    source,
    source_url: undefined,
    source_evidence: [{ source, extractedAt: now, notes: "Initial discovery" }],
    confidence_score: 0.35,
    verification_strength: "weak",
    validation_status: "draft",
    collected_at: now,
    matched_sources: [source],
  };
}

export function extractUrls(text: string): string[] {
  return Array.from(new Set((text.match(/https?:\/\/[^\s)]+/g) || []).map(u => u.replace(/[.,]$/, ""))));
}

export function extractPhone(text: string): string | undefined {
  return text.match(/(\+964|0)\s?7\d{2}[\s-]?\d{3}[\s-]?\d{4}/)?.[0]?.replace(/\s+/g, " ");
}
