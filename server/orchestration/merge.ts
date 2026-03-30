import { NormalizedBusiness, SourceEvidence, SourceName, ValidationStatus, VerificationStrength } from "../domain/business.js";

const SOURCE_PRIORITY: SourceName[] = ["osm", "web", "facebook", "instagram", "gemini", "google_places"];

function normalizeText(input?: string): string {
  return (input || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizePhone(input?: string): string {
  return (input || "").replace(/[^\d+]/g, "");
}

function similarity(a?: string, b?: string): number {
  const x = normalizeText(a);
  const y = normalizeText(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  if (x.includes(y) || y.includes(x)) return 0.85;
  const sx = new Set(x.split(" "));
  const sy = new Set(y.split(" "));
  const inter = [...sx].filter(v => sy.has(v)).length;
  return inter / Math.max(sx.size, sy.size, 1);
}

function distanceScore(a: NormalizedBusiness, b: NormalizedBusiness): number {
  if (a.latitude == null || a.longitude == null || b.latitude == null || b.longitude == null) return 0;
  const dLat = Math.abs(a.latitude - b.latitude);
  const dLng = Math.abs(a.longitude - b.longitude);
  const approxKm = Math.sqrt(dLat ** 2 + dLng ** 2) * 111;
  if (approxKm < 0.1) return 1;
  if (approxKm < 0.5) return 0.7;
  if (approxKm < 1.5) return 0.4;
  return 0;
}

export function isLikelySameBusiness(a: NormalizedBusiness, b: NormalizedBusiness): boolean {
  const phoneMatch = normalizePhone(a.phone) && normalizePhone(a.phone) === normalizePhone(b.phone);
  const websiteMatch = !!a.website && !!b.website && normalizeText(a.website) === normalizeText(b.website);
  const socialMatch =
    (!!a.facebook_url && !!b.facebook_url && normalizeText(a.facebook_url) === normalizeText(b.facebook_url)) ||
    (!!a.instagram_url && !!b.instagram_url && normalizeText(a.instagram_url) === normalizeText(b.instagram_url));

  const nameScore = Math.max(similarity(a.name, b.name), similarity(a.name_ar, b.name_ar), similarity(a.name_ku, b.name_ku));
  const addressScore = similarity(a.address, b.address);
  const geoScore = distanceScore(a, b);
  const cityMatch = !!a.city && !!b.city && normalizeText(a.city) === normalizeText(b.city);

  const score =
    (phoneMatch ? 0.45 : 0) +
    (websiteMatch ? 0.3 : 0) +
    (socialMatch ? 0.3 : 0) +
    nameScore * 0.35 +
    addressScore * 0.2 +
    geoScore * 0.15 +
    (cityMatch ? 0.1 : 0);

  return score >= 0.55;
}

function prefer(current: string | undefined, incoming: string | undefined, incomingSource: SourceName): string | undefined {
  if (!incoming) return current;
  if (!current) return incoming;
  return SOURCE_PRIORITY.indexOf(incomingSource) <= SOURCE_PRIORITY.indexOf("gemini") ? incoming : current;
}

export function mergeBusinesses(base: NormalizedBusiness, incoming: NormalizedBusiness): NormalizedBusiness {
  const mergedSources = Array.from(new Set([...base.matched_sources, ...incoming.matched_sources, incoming.source]));
  const evidence: SourceEvidence[] = [...base.source_evidence, ...incoming.source_evidence];

  const merged: NormalizedBusiness = {
    ...base,
    name: prefer(base.name, incoming.name, incoming.source) || base.name,
    name_ar: prefer(base.name_ar, incoming.name_ar, incoming.source),
    name_ku: prefer(base.name_ku, incoming.name_ku, incoming.source),
    category: prefer(base.category, incoming.category, incoming.source),
    subcategory: prefer(base.subcategory, incoming.subcategory, incoming.source),
    phone: prefer(base.phone, incoming.phone, incoming.source),
    address: prefer(base.address, incoming.address, incoming.source),
    city: prefer(base.city, incoming.city, incoming.source),
    governorate: prefer(base.governorate, incoming.governorate, incoming.source),
    country: prefer(base.country, incoming.country, incoming.source),
    latitude: base.latitude ?? incoming.latitude,
    longitude: base.longitude ?? incoming.longitude,
    website: prefer(base.website, incoming.website, incoming.source),
    facebook_url: prefer(base.facebook_url, incoming.facebook_url, incoming.source),
    instagram_url: prefer(base.instagram_url, incoming.instagram_url, incoming.source),
    google_maps_url: prefer(base.google_maps_url, incoming.google_maps_url, incoming.source),
    hours: prefer(base.hours, incoming.hours, incoming.source),
    description: prefer(base.description, incoming.description, incoming.source),
    image_urls: Array.from(new Set([...(base.image_urls || []), ...(incoming.image_urls || [])])),
    source_evidence: evidence,
    matched_sources: mergedSources as SourceName[],
  };

  const completeness = [merged.name, merged.phone, merged.address, merged.city, merged.category].filter(Boolean).length;
  let confidence = Math.min(0.95, 0.3 + mergedSources.length * 0.18 + completeness * 0.05);
  if (mergedSources.includes("facebook") && mergedSources.includes("instagram")) confidence += 0.05;
  if (mergedSources.includes("osm") && mergedSources.includes("web")) confidence += 0.05;
  merged.confidence_score = Math.min(0.99, Number(confidence.toFixed(2)));

  let verification_strength: VerificationStrength = "weak";
  if (merged.confidence_score >= 0.75) verification_strength = "strong";
  else if (merged.confidence_score >= 0.5) verification_strength = "medium";

  let validation_status: ValidationStatus = "draft";
  if (mergedSources.length > 1 && merged.confidence_score >= 0.6) validation_status = "multi_source_verified";
  else if (mergedSources.length === 1) validation_status = "single_source";
  if (!merged.name || !merged.city) validation_status = "needs_review";

  merged.verification_strength = verification_strength;
  merged.validation_status = validation_status;

  return merged;
}

export function dedupeBusinesses(items: NormalizedBusiness[]): NormalizedBusiness[] {
  const merged: NormalizedBusiness[] = [];

  for (const candidate of items) {
    const idx = merged.findIndex(existing => isLikelySameBusiness(existing, candidate));
    if (idx === -1) merged.push(candidate);
    else merged[idx] = mergeBusinesses(merged[idx], candidate);
  }

  return merged;
}
