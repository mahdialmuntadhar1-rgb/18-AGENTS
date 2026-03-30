import { GoogleGenAI } from "@google/genai";
import { NormalizedBusiness, SearchInput, SourceAdapter } from "../domain/business.js";
import { extractUrls, makeBaseBusiness } from "./utils.js";

export class GeminiResearchAdapter implements SourceAdapter {
  private client: GoogleGenAI | null;

  constructor() {
    this.client = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
  }

  getSourceName() {
    return "gemini" as const;
  }

  getCapabilities() {
    return { discovery: true, enrichment: true, notes: "Broad AI research discovery for Iraq" };
  }

  async searchBusinesses(input: SearchInput): Promise<NormalizedBusiness[]> {
    if (!this.client) {
      return [makeBaseBusiness("gemini", input, `${input.category || "Business"} sample - ${input.city || "Baghdad"}`)];
    }

    const prompt = `Discover up to ${input.limit || 10} real or likely public businesses in Iraq for query: ${input.query}. City: ${input.city || ""}, Governorate: ${input.governorate || ""}, Category: ${input.category || ""}. Return strict JSON array with keys: name, name_ar, name_ku, category, subcategory, phone, address, city, governorate, website, facebook_url, instagram_url, google_maps_url, source_url, description, notes.`;

    const result = await this.client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });

    const text = result.text || "[]";
    const rows = JSON.parse(text) as any[];

    return rows.map((row) => {
      const base = makeBaseBusiness("gemini", input, row.name || "Unknown business");
      const sourceUrl = row.source_url || row.website;
      return {
        ...base,
        ...row,
        source_url: sourceUrl,
        source_evidence: [{
          source: "gemini",
          sourceUrl,
          notes: row.notes || "Gemini structured extraction",
          extractedAt: new Date().toISOString(),
          rawRef: extractUrls(JSON.stringify(row)).join(",")
        }],
      } as NormalizedBusiness;
    });
  }

  async enrichBusiness(input: NormalizedBusiness): Promise<Partial<NormalizedBusiness> | null> {
    if (!this.client) return null;
    const prompt = `Given business: ${JSON.stringify(input)}. Provide only JSON object with missing enrichment fields among: name_ar,name_ku,phone,address,website,facebook_url,instagram_url,description,hours,source_url and confidence_hint (0-1).`;
    const result = await this.client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { responseMimeType: "application/json" }
    });
    const row = JSON.parse(result.text || "{}");
    return {
      ...row,
      source_evidence: [{ source: "gemini", extractedAt: new Date().toISOString(), notes: "Gemini enrichment" }],
    };
  }
}
