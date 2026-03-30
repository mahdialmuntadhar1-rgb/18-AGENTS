import { NormalizedBusiness, SearchInput, SourceAdapter } from "../domain/business.js";
import { makeBaseBusiness } from "./utils.js";

export class GooglePlacesAdapter implements SourceAdapter {
  getSourceName() {
    return "google_places" as const;
  }

  getCapabilities() {
    return { discovery: true, enrichment: true, notes: "Optional fallback only; requires API key" };
  }

  async searchBusinesses(input: SearchInput): Promise<NormalizedBusiness[]> {
    const key = process.env.GOOGLE_PLACES_API_KEY;
    if (!key) return [];

    const query = encodeURIComponent(`${input.query} ${input.city || "Iraq"}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${key}`;
    try {
      const data = await fetch(url).then(r => r.json()) as any;
      return (data.results || []).slice(0, input.limit || 10).map((place: any) => {
        const base = makeBaseBusiness("google_places", input, place.name);
        return {
          ...base,
          address: place.formatted_address,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
          google_maps_url: `https://maps.google.com/?q=place_id:${place.place_id}`,
          source_url: `https://maps.google.com/?q=place_id:${place.place_id}`,
          source_evidence: [{ source: "google_places", extractedAt: new Date().toISOString(), notes: `rating:${place.rating || "n/a"}` }],
        } as NormalizedBusiness;
      });
    } catch {
      return [];
    }
  }

  async enrichBusiness(input: NormalizedBusiness): Promise<Partial<NormalizedBusiness> | null> {
    return null;
  }
}
