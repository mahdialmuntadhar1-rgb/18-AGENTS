import { NormalizedBusiness, SourceAdapter } from "../domain/business.js";

export class FacebookDiscoveryAdapter implements SourceAdapter {
  getSourceName() {
    return "facebook" as const;
  }

  getCapabilities() {
    return { discovery: true, enrichment: true, notes: "Best-effort page discovery from public web results" };
  }

  async searchBusinesses(input: { query: string; city?: string; governorate?: string; category?: string; limit?: number }): Promise<NormalizedBusiness[]> {
    const q = encodeURIComponent(`site:facebook.com ${input.query} ${input.city || "Iraq"}`);
    const url = `https://duckduckgo.com/html/?q=${q}`;
    try {
      const html = await fetch(url).then(r => r.text());
      const links = Array.from(new Set(Array.from(html.matchAll(/https?:\/\/(?:www\.)?facebook\.com\/[\w\-./?=&%]+/gi)).map(x => x[0])));
      return links.slice(0, input.limit || 8).map((link) => ({
        name: input.query,
        city: input.city,
        governorate: input.governorate,
        category: input.category,
        country: "Iraq",
        source: "facebook",
        source_url: link,
        facebook_url: link,
        source_evidence: [{ source: "facebook", sourceUrl: link, extractedAt: new Date().toISOString(), notes: "Discovered via public search" }],
        confidence_score: 0.45,
        verification_strength: "weak",
        validation_status: "single_source",
        collected_at: new Date().toISOString(),
        matched_sources: ["facebook"],
      }));
    } catch {
      return [];
    }
  }

  async enrichBusiness(input: NormalizedBusiness): Promise<Partial<NormalizedBusiness> | null> {
    const target = input.facebook_url || input.source_url;
    if (!target) return null;
    const likelyOfficial = /\/pages\//i.test(target) || /facebook\.com\/[\w.\-]+\/?$/i.test(target);
    return {
      facebook_url: target,
      source_evidence: [{ source: "facebook", sourceUrl: target, extractedAt: new Date().toISOString(), notes: likelyOfficial ? "Likely official page" : "Page needs manual review" }],
    };
  }
}
