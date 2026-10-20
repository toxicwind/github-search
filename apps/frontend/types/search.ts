// TypeScript types for search functionality

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
    // Emergent Properties (Non-Baseline)
    isEmergent?: boolean;
    evaluation?: string;
    latentScore?: number;
    health?: string;
}

export interface SearchRequest {
    query: string;
    categories: SearchCategory[];
    per_page?: number;
    raw?: boolean;
    smart?: boolean;
    cluster?: boolean;
    recursive?: boolean; // Trigger swarm
    experimental?: boolean;
}

export type SearchCategory =
    | 'code'
    | 'repositories'
    | 'issues'
    | 'pull_requests'
    | 'users'
    | 'discussions'
    | 'commits'
    | 'packages'
    | 'wikis'
    | 'topics'
    | 'marketplace'
    | 'unified';

export interface SearchFilters {
    languages: string[];
    starRanges: StarRange[];
    dateRange: DateRange | null;
    fileExtensions: string[];
}

export type StarRange = '<10' | '10-100' | '100-1k' | '1k+';
export type DateRange = 'day' | 'week' | 'month' | 'year';

export interface QuerySuggestion {
    query: string;
    score: number;
    type: 'history' | 'trending' | 'ai';
}

export interface SearchAnalytics {
    trending: TrendingQuery[];
    popular: PopularQuery[];
    recentSearches: string[];
}

export interface TrendingQuery {
    query: string;
    count: number;
    trend: 'up' | 'down' | 'stable';
}

export interface PopularQuery {
    query: string;
    count: number;
    ctr: number; // Click-through rate;
}

// Cluster types (mirrors crates/core/src/clustering.rs)
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
    clusters?: Cluster[]; // Computed flat list for visualization
}

export interface CompareResponse {
    query: string;
    optimised: SearchResult[];
    raw: SearchResult[];
    meta: CompareMeta;
}

export interface CompareMeta {
    optimised_count: number;
    raw_count: number;
    time_ms: number;
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
