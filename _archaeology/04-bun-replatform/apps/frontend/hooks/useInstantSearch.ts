import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient } from '../lib/api-client';
import type { SearchResult, SearchCategory, ClusteredResults } from '../types/search';

interface UseInstantSearchOptions {
    debounceMs?: number;
    categories?: SearchCategory[];
    perPage?: number;
    enabled?: boolean;
    smart?: boolean;
    cluster?: boolean;
}

interface UseInstantSearchReturn {
    results: SearchResult[];
    clusteredResults: ClusteredResults | null;
    isLoading: boolean;
    error: Error | null;
    searchTime: number | null;
    search: (query: string) => void;
    clearResults: () => void;
    donors: SearchResult[];
    intent: any | null;
    metrics: any | null;
}

/**
 * Instant search hook with debouncing (discovered pattern: 150ms optimal)
 * 
 * Features:
 * - Debounced search (default 150ms)
 * - Automatic request cancellation
 * - Search time tracking
 * - TanStack Query integration for caching
 */
export function useInstantSearch(
    options: UseInstantSearchOptions = {}
): UseInstantSearchReturn {
    const {
        debounceMs = 150,
        categories,
        perPage = 20,
        enabled = true,
        smart = true,
        cluster = false,
    } = options;

    // Stable categories fallback
    const stableCategories = useMemo(() =>
        categories || (['code', 'repositories'] as SearchCategory[]),
        [categories]);

    const [query, setQuery] = useState('');
    const [debouncedQuery, setDebouncedQuery] = useState('');
    const [searchTime, setSearchTime] = useState<number | null>(null);
    const debounceTimerRef = useRef<any>(undefined);

    // Debounce the search query
    useEffect(() => {
        if (debounceTimerRef.current) {
            clearTimeout(debounceTimerRef.current);
        }

        debounceTimerRef.current = window.setTimeout(() => {
            setDebouncedQuery(query);
        }, debounceMs);

        return () => {
            if (debounceTimerRef.current) {
                clearTimeout(debounceTimerRef.current);
            }
        };
    }, [query, debounceMs]);

    // Execute search with TanStack Query
    const {
        data,
        isLoading,
        error,
    } = useQuery({
        queryKey: ['search', debouncedQuery, stableCategories, perPage, smart, cluster],
        queryFn: async () => {
            if (!debouncedQuery.trim()) return null;

            const start = performance.now();
            const response = await apiClient.search({
                query: debouncedQuery,
                categories: stableCategories,
                per_page: perPage,
                smart,
                cluster,
            });
            const end = performance.now();

            // Use a ref or a non-looping way to update search time if needed, 
            // but for now, we'll return it with the data or set it only when data changes
            return { response, time: end - start };
        },
        enabled: enabled && debouncedQuery.trim().length > 0,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
    });

    // Sync search time without looping
    useEffect(() => {
        if (data?.time) {
            setSearchTime(data.time);
        }
    }, [data?.time]);

    const results: SearchResult[] = useMemo(() => {
        if (!data?.response) return [];
        if (Array.isArray(data.response)) return data.response;
        const resp = data.response as any;
        if (resp.results && Array.isArray(resp.results)) {
            return resp.results;
        }
        return [];
    }, [data?.response]);

    const donors: SearchResult[] = useMemo(() => {
        if (data?.response && !Array.isArray(data.response)) {
            const resp = data.response as any;
            return resp.donors || [];
        }
        return [];
    }, [data?.response]);

    const intent = (data?.response && !Array.isArray(data.response)) ? (data.response as any).intent || null : null;
    const metrics = (data?.response && !Array.isArray(data.response)) ? (data.response as any).metrics || null : null;

    const clusteredResults: ClusteredResults | null =
        data?.response && !Array.isArray(data.response) && (data.response as any).clusters ? data.response as ClusteredResults : null;

    const search = useCallback((newQuery: string) => {
        setQuery(newQuery);
    }, []);

    const clearResults = useCallback(() => {
        setQuery('');
        setDebouncedQuery('');
        setSearchTime(null);
    }, []);

    return {
        results,
        clusteredResults,
        isLoading,
        error: error as Error | null,
        searchTime,
        search,
        clearResults,
        donors,
        intent,
        metrics,
    };
}
