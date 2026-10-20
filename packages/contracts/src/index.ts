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
  strict?: boolean;
  recursive?: boolean;
  experimental?: boolean;
}

export type DegradationLevel = "auth" | "rate_limit" | "timeout" | "backend_down" | "internal";

export interface Degradation {
  level: DegradationLevel;
  reason: string;
  backend_failed: string;
  backend_used: string;
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
    degradation?: Degradation;
    strict_applied?: boolean;
    supplemental_disabled?: boolean;
    category_plan?: string[];
    filter_stats?: {
      before_filter?: number;
      after_filter?: number;
      dropped?: number;
    };
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
};

// New types for expanded MCP commands (ghas layer)
export interface RepositoryInfo {
  full_name: string;
  description?: string;
  html_url: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  language?: string;
  updated_at?: string;
  private: boolean;
  topics?: string[];
}

export interface FileContent {
  path: string;
  content: string; // base64 decoded text when possible
  encoding: string;
  size: number;
  html_url?: string;
  download_url?: string;
}

export interface IssueItem {
  number: number;
  title: string;
  html_url: string;
  state: string;
  user?: { login: string };
  comments: number;
  updated_at?: string;
  body?: string;
  labels?: Array<{ name: string }>;
}

export interface GetRepositoryRequest {
  owner: string;
  repo: string;
}

export interface GetFileContentsRequest {
  owner: string;
  repo: string;
  path: string;
  ref?: string;
}

export interface SearchIssuesRequest {
  query: string;
  per_page?: number;
  state?: "open" | "closed" | "all";
}

export interface ListIssuesRequest {
  owner: string;
  repo: string;
  state?: "open" | "closed" | "all";
  per_page?: number;
  labels?: string;
}
