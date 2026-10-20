// API client for GitHub search backend

import type { SearchRequest, SearchResult, ClusteredResults, CompareResponse } from '../types/search';

const API_BASE_URL =
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:35161';

export function resolveApiBaseUrl() {
    return API_BASE_URL;
}

// Matches Rust SearchResponse enum
type SearchResponse =
    | SearchResult[]
    | { List: SearchResult[] }
    | { Clustered: ClusteredResults }
    | { Enhanced: import('../types/search').SearchResponseV2 };

type Envelope<T> = {
    ok: boolean;
    source: 'api' | 'mcp' | 'hybrid' | string;
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

export class SearchApiClient {
    private baseUrl: string;

    constructor(baseUrl: string = API_BASE_URL) {
        this.baseUrl = baseUrl;
    }

    async search(request: SearchRequest): Promise<SearchResult[] | ClusteredResults> {
        // 1. Try Primary Search (Baseline)
        try {
            const results = await this.executeRequest(request, false);

            // If we have results, great.
            if (Array.isArray(results) && results.length > 0) {
                return results;
            }
            if (results && typeof results === 'object' && 'results' in results && Array.isArray((results as any).results)) {
                return (results as any).results;
            }
            if (results && typeof results === 'object' && 'List' in results && Array.isArray((results as any).List)) {
                return (results as any).List;
            }

            // 2. If 0 results, Trigger Backend Swarm (Recursive)
            console.warn('[Swarm] Baseline returned 0. Escalating to Backend Swarm...');
            return await this.executeRequest(request, true);

        } catch (e) {
            console.warn('[Swarm] Primary search failed. Escalating to Backend Swarm...', e);
            // On error (e.g. 404/500), also try recursive recovery
            return await this.executeRequest(request, true);
        }
    }

    private async executeRequest(request: SearchRequest, recursive: boolean): Promise<SearchResult[] | ClusteredResults> {
        const params = new URLSearchParams({
            query: request.query,
            categories: request.categories.join(','),
            per_page: (request.per_page || 20).toString(),
            smart: (request.smart ?? true).toString(),
            cluster: (request.cluster ?? false).toString(),
            recursive: recursive.toString(),
            backend: 'hybrid',
        });

        const response = await fetch(`${this.baseUrl}/api/search?${params}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data: any = await response.json();
        const payload: any = data?.data ?? data;

        if (payload.Enhanced) return payload.Enhanced;
        if (payload.List) return payload.List;
        if (payload.Clustered) return payload.Clustered;
        if (Array.isArray(payload)) return payload;

        return [];
    }

    async getSuggestions(_prefix: string, _limit: number = 10): Promise<string[]> {
        // Placeholder - will implement suggestions endpoint later
        return [];
    }

    async compare(query: string): Promise<CompareResponse> {
        const params = new URLSearchParams({
            query,
            per_page: '20',
        });

        const response = await fetch(`${this.baseUrl}/api/compare?${params}`);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}`);
        }

        const data: Envelope<CompareResponse> | CompareResponse = await response.json();
        return (data as Envelope<CompareResponse>).data ?? (data as CompareResponse);
    }

    async getAnalytics() {
        // Placeholder - will implement analytics endpoint later
        return {
            trending: [],
            popular: [],
            recentSearches: [],
        };
    }
}

export const apiClient = new SearchApiClient();
