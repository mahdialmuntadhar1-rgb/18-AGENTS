import { NormalizedBusiness, SearchInput, SourceAdapter } from "../domain/business.js";
import { extractPhone, makeBaseBusiness } from "./utils.js";

export class WebSearchAdapter implements SourceAdapter {
  getSourceName() {
    return "web" as const;
  }

  getCapabilities() {
    return { discovery: true, enrichment: true, notes: "Public websites/directories extraction" };
  }

  async searchBusinesses(input: SearchInput): Promise<NormalizedBusiness[]> {
    const query = encodeURIComponent(`${input.query} ${input.city || "Iraq"} business`);
    const url = `https://duckduckgo.com/html/?q=${query}`;

    try {
      const html = await fetch(url).then(r => r.text());
      const blocks = Array.from(html.matchAll(/<a[^>]+class="result__a"[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/g));
      return blocks.slice(0, input.limit || 10).map((m) => {
        const href = m[1];
        const title = m[2].replace(/<[^>]+>/g, "");
        const business = makeBaseBusiness("web", input, title);
        business.source_url = href;
        business.website = href.startsWith("http") ? href : undefined;
        business.source_evidence = [{ source: "web", sourceUrl: href, extractedAt: new Date().toISOString(), notes: "Search listing" }];
        return business;
      });
    } catch {
      return [];
    }
  }

  async enrichBusiness(input: NormalizedBusiness): Promise<Partial<NormalizedBusiness> | null> {
    const target = input.website || input.source_url;
    if (!target) return null;

    try {
      const html = await fetch(target).then(r => r.text());
      const phone = extractPhone(html) || input.phone;
      const facebook_url = html.match(/https?:\/\/(www\.)?facebook\.com\/[\w\-./?=&%]+/i)?.[0];
      const instagram_url = html.match(/https?:\/\/(www\.)?instagram\.com\/[\w\-./?=&%]+/i)?.[0];
      return {
        phone,
        facebook_url,
        instagram_url,
        source_evidence: [{ source: "web", sourceUrl: target, extractedAt: new Date().toISOString(), notes: "Website extracted fields" }],
      };
    } catch {
      return null;
    }
  }
}
