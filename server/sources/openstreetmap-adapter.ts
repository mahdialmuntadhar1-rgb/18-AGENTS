import { NormalizedBusiness, SearchInput, SourceAdapter } from "../domain/business.js";
import { makeBaseBusiness } from "./utils.js";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";

export class OpenStreetMapAdapter implements SourceAdapter {
  getSourceName() {
    return "osm" as const;
  }

  getCapabilities() {
    return { discovery: true, enrichment: true, notes: "Structured POI data from OSM Overpass" };
  }

  async searchBusinesses(input: SearchInput): Promise<NormalizedBusiness[]> {
    const area = input.city || input.governorate || "Baghdad";
    const categoryTag = input.category?.toLowerCase().includes("restaurant") ? "amenity=restaurant" : "shop";
    const query = `[out:json][timeout:25];area["name"="${area}"]->.searchArea;(node[${categoryTag}](area.searchArea);way[${categoryTag}](area.searchArea););out center 30;`;

    try {
      const resp = await fetch(OVERPASS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: query,
      });
      const json = await resp.json() as any;
      return (json.elements || []).slice(0, input.limit || 30).map((e: any) => {
        const base = makeBaseBusiness("osm", input, e.tags?.name || "Unnamed OSM place");
        const lat = e.lat ?? e.center?.lat;
        const lng = e.lon ?? e.center?.lon;
        const sourceUrl = `https://www.openstreetmap.org/${e.type}/${e.id}`;
        return {
          ...base,
          subcategory: e.tags?.amenity || e.tags?.shop,
          address: [e.tags?.["addr:street"], e.tags?.["addr:city"]].filter(Boolean).join(", ") || undefined,
          phone: e.tags?.phone,
          website: e.tags?.website,
          latitude: lat,
          longitude: lng,
          google_maps_url: lat && lng ? `https://maps.google.com/?q=${lat},${lng}` : undefined,
          source_url: sourceUrl,
          source_evidence: [{ source: "osm", sourceUrl, extractedAt: new Date().toISOString(), notes: JSON.stringify(e.tags || {}) }],
        } as NormalizedBusiness;
      });
    } catch {
      return [];
    }
  }

  async enrichBusiness(input: NormalizedBusiness): Promise<Partial<NormalizedBusiness> | null> {
    if (!input.name || !input.city) return null;
    const found = await this.searchBusinesses({ query: input.name, city: input.city, category: input.category, limit: 5 });
    const match = found.find(f => f.name.toLowerCase().includes(input.name.toLowerCase()) || input.name.toLowerCase().includes(f.name.toLowerCase()));
    if (!match) return null;
    return {
      latitude: match.latitude,
      longitude: match.longitude,
      address: match.address,
      source_evidence: [{ source: "osm", extractedAt: new Date().toISOString(), notes: "OSM enrichment match" }],
    };
  }
}
