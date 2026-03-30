export type SourceName =
  | "gemini"
  | "osm"
  | "web"
  | "facebook"
  | "instagram"
  | "google_places";

export type ValidationStatus = "draft" | "single_source" | "multi_source_verified" | "needs_review" | "approved";
export type VerificationStrength = "weak" | "medium" | "strong";

export interface SourceEvidence {
  source: SourceName;
  sourceUrl?: string;
  matchedOn?: string[];
  notes?: string;
  extractedAt: string;
  rawRef?: string;
}

export interface NormalizedBusiness {
  id?: string;
  name: string;
  name_ar?: string;
  name_ku?: string;
  category?: string;
  subcategory?: string;
  phone?: string;
  address?: string;
  city?: string;
  governorate?: string;
  country?: string;
  latitude?: number;
  longitude?: number;
  website?: string;
  facebook_url?: string;
  instagram_url?: string;
  google_maps_url?: string;
  source: SourceName;
  source_url?: string;
  source_evidence: SourceEvidence[];
  confidence_score: number;
  verification_strength: VerificationStrength;
  validation_status: ValidationStatus;
  hours?: string;
  description?: string;
  image_urls?: string[];
  collected_by_agent?: string;
  collected_at: string;
  matched_sources: SourceName[];
  raw_source_payload_ref?: string;
}

export interface SearchInput {
  query: string;
  city?: string;
  governorate?: string;
  category?: string;
  latitude?: number;
  longitude?: number;
  limit?: number;
}

export interface SourceAdapter {
  getSourceName(): SourceName;
  getCapabilities(): { discovery: boolean; enrichment: boolean; notes?: string };
  searchBusinesses(input: SearchInput): Promise<NormalizedBusiness[]>;
  enrichBusiness(input: NormalizedBusiness): Promise<Partial<NormalizedBusiness> | null>;
}
