import { NormalizedBusiness, SearchInput, SourceAdapter, SourceName } from "../domain/business.js";
import { dedupeBusinesses, mergeBusinesses } from "./merge.js";

export interface RunRequest extends SearchInput {
  sources: SourceName[];
  collectedByAgent?: string;
}

export interface RunResult {
  businesses: NormalizedBusiness[];
  logs: Array<{ step: string; source?: SourceName; message: string }>;
}

export class MultiSourceOrchestrator {
  constructor(private adapters: Map<SourceName, SourceAdapter>) {}

  async run(request: RunRequest): Promise<RunResult> {
    const logs: RunResult["logs"] = [];
    const discoverySources = request.sources.filter(s => ["gemini", "osm", "web", "google_places", "facebook", "instagram"].includes(s));

    let discovered: NormalizedBusiness[] = [];
    for (const source of discoverySources) {
      const adapter = this.adapters.get(source);
      if (!adapter) continue;
      logs.push({ step: "discovery", source, message: `Running discovery on ${source}` });
      const found = await adapter.searchBusinesses(request);
      discovered.push(...found.map(b => ({ ...b, collected_by_agent: request.collectedByAgent || "orchestrator" })));
      logs.push({ step: "discovery", source, message: `${found.length} candidates discovered` });
    }

    let merged = dedupeBusinesses(discovered);

    for (const source of request.sources) {
      const adapter = this.adapters.get(source);
      if (!adapter?.getCapabilities().enrichment) continue;

      logs.push({ step: "enrichment", source, message: `Enrichment step on ${source}` });

      merged = await Promise.all(merged.map(async (biz) => {
        const enriched = await adapter.enrichBusiness(biz);
        if (!enriched) return biz;

        const asBiz: NormalizedBusiness = {
          ...biz,
          ...enriched,
          source: source,
          source_evidence: [...biz.source_evidence, ...((enriched.source_evidence as any) || [])],
          matched_sources: Array.from(new Set([...biz.matched_sources, source])) as SourceName[],
          collected_at: biz.collected_at,
          confidence_score: biz.confidence_score,
          verification_strength: biz.verification_strength,
          validation_status: biz.validation_status,
          name: biz.name,
        };
        return mergeBusinesses(biz, asBiz);
      }));
    }

    logs.push({ step: "finalize", message: `Final ${merged.length} merged businesses` });
    return { businesses: merged, logs };
  }
}
