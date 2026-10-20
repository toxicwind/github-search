export type SearchCategory =
  | "code"
  | "repositories"
  | "issues"
  | "pull_requests"
  | "users"
  | "discussions"
  | "commits"
  | "packages"
  | "wikis"
  | "topics"
  | "marketplace"
  | "unified";

export interface SearchResult {
  category: SearchCategory;
  repository: string;
  path?: string;
  url: string;
  raw_url?: string;
  title: string;
  subtitle?: string;
  snippet?: string;
  language?: string;
  stars?: number;
  forks?: number;
  score: number;
  updated_at?: string;
  highlights?: string[];
  isEmergent?: boolean;
  evaluation?: string;
  latentScore?: number;
  health?: string;
}

export interface Cluster {
  name: string;
  count: number;
  score_sum: number;
  items: SearchResult[];
}

export interface ClusteredResults {
  by_language: Cluster[];
  by_category: Cluster[];
  by_repo: Cluster[];
  clusters?: Cluster[];
}

export interface SearchResponseV2 {
  query: string;
  results: SearchResult[];
  donors: SearchResult[];
  intent?: {
    label: string;
    confidence: number;
  };
  metrics: {
    latency_ms: number;
    strategies: string[];
  };
}

export interface CompareResponse {
  query: string;
  optimised: SearchResult[];
  raw: SearchResult[];
  meta: {
    optimised_count: number;
    raw_count: number;
    time_ms: number;
  };
}

export interface SearchRequest {
  query: string;
  categories?: SearchCategory[];
  per_page?: number;
  smart?: boolean;
  cluster?: boolean;
  raw?: boolean;
  recursive?: boolean;
  experimental?: boolean;
}

export type ApiEnvelope<T> = {
  ok: boolean;
  source: "api" | "mcp" | "hybrid";
  data: T;
  meta: {
    latency_ms: number;
    backend: string;
    session_id?: string;
    degraded?: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
};
