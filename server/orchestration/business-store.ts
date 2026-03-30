import { randomUUID } from "node:crypto";
import { NormalizedBusiness } from "../domain/business.js";

export interface QueryParams {
  source?: string;
  status?: string;
  minConfidence?: number;
  page: number;
  pageSize: number;
}

class InMemoryBusinessStore {
  private items: NormalizedBusiness[] = [];

  upsertMany(rows: NormalizedBusiness[]) {
    for (const row of rows) {
      const matchIndex = this.items.findIndex(i =>
        (i.phone && row.phone && i.phone === row.phone) ||
        (i.name.toLowerCase() === row.name.toLowerCase() && i.city === row.city)
      );
      if (matchIndex >= 0) {
        this.items[matchIndex] = { ...this.items[matchIndex], ...row, id: this.items[matchIndex].id };
      } else {
        this.items.push({ ...row, id: randomUUID() });
      }
    }
  }

  list(params: QueryParams) {
    let data = [...this.items];
    if (params.source) data = data.filter(i => i.matched_sources.includes(params.source as any));
    if (params.status) data = data.filter(i => i.validation_status === params.status);
    if (params.minConfidence != null) data = data.filter(i => i.confidence_score >= params.minConfidence);

    const total = data.length;
    const start = (params.page - 1) * params.pageSize;
    const end = start + params.pageSize;
    return {
      data: data.slice(start, end),
      total,
      page: params.page,
      pageSize: params.pageSize,
      totalPages: Math.max(1, Math.ceil(total / params.pageSize)),
    };
  }
}

export const businessStore = new InMemoryBusinessStore();
