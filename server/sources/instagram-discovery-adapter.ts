import { NormalizedBusiness, SourceAdapter } from "../domain/business.js";

export class InstagramDiscoveryAdapter implements SourceAdapter {
  getSourceName() {
    return "instagram" as const;
  }

  getCapabilities() {
    return { discovery: true, enrichment: true, notes: "Best-effort profile discovery from public search" };
  }

  async searchBusinesses(input: { query: string; city?: string; governorate?: string; category?: string; limit?: number }): Promise<NormalizedBusiness[]> {
    const q = encodeURIComponent(`site:instagram.com ${input.query} ${input.city || "Iraq"}`);
    const url = `https://duckduckgo.com/html/?q=${q}`;
    try {
      const html = await fetch(url).then(r => r.text());
      const links = Array.from(new Set(Array.from(html.matchAll(/https?:\/\/(?:www\.)?instagram\.com\/[\w\-./?=&%]+/gi)).map(x => x[0])));
      return links.slice(0, input.limit || 8).map((link) => ({
        name: input.query,
        city: input.city,
        governorate: input.governorate,
        category: input.category,
        country: "Iraq",
        source: "instagram",
        source_url: link,
        instagram_url: link,
        source_evidence: [{ source: "instagram", sourceUrl: link, extractedAt: new Date().toISOString(), notes: "Discovered via public search" }],
        confidence_score: 0.45,
        verification_strength: "weak",
        validation_status: "single_source",
        collected_at: new Date().toISOString(),
        matched_sources: ["instagram"],
      }));
    } catch {
      return [];
    }
  }

  async enrichBusiness(input: NormalizedBusiness): Promise<Partial<NormalizedBusiness> | null> {
    const profile = input.instagram_url || input.source_url;
    if (!profile) return null;
    const handle = profile.match(/instagram\.com\/([^/?#]+)/i)?.[1];
    return {
      instagram_url: profile,
      description: input.description || (handle ? `Instagram profile @${handle}` : input.description),
      source_evidence: [{ source: "instagram", sourceUrl: profile, extractedAt: new Date().toISOString(), notes: "Profile enrichment" }],
    };
  }
}
