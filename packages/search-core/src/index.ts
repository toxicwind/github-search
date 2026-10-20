/**
 * @ghas/search-core — adaptive search result builder
 * 
 * Converts raw GitHub API results into structured search responses
 * with intelligent scoring and ranking.
 */

import type { SearchCategory, SearchResult } from "@ghas/contracts";

export interface BuildOptions {
  query: string;
  categories: SearchCategory[];
  per_page: number;
  smart: boolean;
  strict: boolean;
}

export interface BuiltResponse {
  query: string;
  results: SearchResult[];
  intent: {
    label: string;
    confidence: number;
  };
  metrics: {
    latency_ms: number;
    strategies: string[];
  };
  telemetry: {
    strict_applied: boolean;
    supplemental_disabled: boolean;
    category_plan: SearchCategory[];
    filter_stats: {
      before_filter: number;
      after_filter: number;
      dropped: number;
    };
  };
  donors?: Array<{
    category: string;
    repository: string;
    url: string;
    title: string;
    subtitle?: string;
    stars?: number;
    score: number;
  }>;
}

const INTENT_LABELS: Record<string, string> = {
  code: "code_search",
  repositories: "discovery",
  issues: "troubleshooting",
  pull_requests: "contribution",
  users: "people_search",
};

export function buildResponse(
  options: BuildOptions,
  results: SearchResult[],
  latencyMs: number
): BuiltResponse {
  const { query, categories, per_page, smart, strict } = options;

  // Detect intent from results
  const intent = detectIntent(query, results);

  // Build donor list (top results for display)
  const donors = results
    .filter((r) => r.category === "repositories")
    .slice(0, 5)
    .map((r) => ({
      category: r.category,
      repository: r.repository,
      url: r.url,
      title: r.title,
      subtitle: r.subtitle,
      stars: r.stars,
      score: r.latentScore ?? Math.round(r.score),
    }));

  return {
    query,
    results,
    intent,
    metrics: {
      latency_ms: latencyMs,
      strategies: smart ? ["adaptive_ranking", "stable"] : ["direct_github"],
    },
    telemetry: {
      strict_applied: strict,
      supplemental_disabled: !smart,
      category_plan: categories,
      filter_stats: {
        before_filter: results.length,
        after_filter: results.length,
        dropped: 0,
      },
    },
    donors,
  };
}

function detectIntent(query: string, results: SearchResult[]): { label: string; confidence: number } {
  const lowered = query.toLowerCase();
  
  // Count category distribution
  const counts: Record<string, number> = {};
  for (const r of results) {
    counts[r.category] = (counts[r.category] || 0) + 1;
  }

  // Determine dominant category
  let dominant: string = "repositories";
  let maxCount = 0;
  for (const [cat, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = cat;
    }
  }

  // Override based on query patterns
  if (lowered.includes("issue") || lowered.includes("bug") || lowered.includes("error")) {
    dominant = "issues";
  } else if (lowered.includes("pr ") || lowered.includes("pull request") || lowered.includes("merge")) {
    dominant = "pull_requests";
  } else if (lowered.includes("@") || lowered.includes("user:") || lowered.includes("author:")) {
    dominant = "users";
  } else if (
    lowered.includes("function ") ||
    lowered.includes("class ") ||
    lowered.includes("import ") ||
    lowered.includes("const ") ||
    lowered.includes("useeffect")
  ) {
    dominant = "code";
  }

  const confidence = Math.min(0.95, 0.5 + maxCount / Math.max(1, results.length) * 0.5);

  return {
    label: INTENT_LABELS[dominant] || "discovery",
    confidence: Math.round(confidence * 100) / 100,
  };
}

function detectIntent(query: string, results: SearchResult[]): { label: string; confidence: number } {
  const lowered = query.toLowerCase();
  
  // Count category distribution
  const counts: Record<string, number> = {};
  for (const r of results) {
    counts[r.category] = (counts[r.category] || 0) + 1;
  }

  // Determine dominant category
  let dominant: string = "repositories";
  let maxCount = 0;
  for (const [cat, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      dominant = cat;
    }
  }

  // Override based on query patterns
  if (lowered.includes("issue") || lowered.includes("bug") || lowered.includes("error")) {
    dominant = "issues";
  } else if (lowered.includes("pr ") || lowered.includes("pull request") || lowered.includes("merge")) {
    dominant = "pull_requests";
  } else if (lowered.includes("@") || lowered.includes("user:") || lowered.includes("author:")) {
    dominant = "users";
  } else if (
    lowered.includes("function ") ||
    lowered.includes("class ") ||
    lowered.includes("import ") ||
    lowered.includes("const ") ||
    lowered.includes("useeffect")
  ) {
    dominant = "code";
  }

  const confidence = Math.min(0.95, 0.5 + maxCount / Math.max(1, results.length) * 0.5);

  return {
    label: INTENT_LABELS[dominant] || "discovery",
    confidence: Math.round(confidence * 100) / 100,
  };
}

export interface ClusterOptions {
  results: SearchResult[];
  maxClusters?: number;
  minClusterSize?: number;
}

export interface Cluster {
  label: string;
  count: number;
  repositories: Array<{
    name: string;
    url: string;
    stars: number;
    description: string;
  }>;
  sampleQueries: string[];
}

export function buildClusters(options: ClusterOptions): Cluster[] {
  const { results, maxClusters = 5, minClusterSize = 2 } = options;
  
  // Group results by repository
  const repoGroups = new Map<string, SearchResult[]>();
  for (const result of options.results) {
    if (!repoGroups.has(result.repository)) {
      repoGroups.set(result.repository, []);
    }
    repoGroups.get(result.repository)!.push(result);
  }
  
  // Convert to clusters
  const clusters: Cluster[] = [];
  for (const [repo, results] of repoGroups) {
    if (results.length >= (options.minClusterSize ?? 2)) {
      const first = results[0];
      clusters.push({
        label: first.repository,
        count: results.length,
        repositories: [{
          name: first.repository,
          url: first.url,
          stars: first.stars ?? 0,
          description: first.subtitle ?? first.title ?? "",
        }],
        sampleQueries: results.slice(0, 3).map(r => r.title ?? ""),
      });
    }
  }
  
  // Sort by count descending and limit
  clusters.sort((a, b) => b.count - a.count);
  return clusters.slice(0, options.maxClusters ?? 5);
}
