import { describe, expect, test } from "bun:test";
import type { SearchResult } from "@ghas/contracts";
import { applyExperimentalRanking } from "./apply.ts";
import { bm25Score, documentFrequencies, identifierMatchScore } from "./bm25.ts";
import { identifierTokens, tokenizeWithIdents } from "./tokenize.ts";

function hit(
  partial: Partial<SearchResult> & { title: string },
): SearchResult {
  return {
    category: "code",
    repository: partial.repository ?? "x/y",
    url: partial.url ?? "https://example.com",
    score: partial.score ?? 1,
    title: partial.title,
    path: partial.path,
    snippet: partial.snippet,
    language: partial.language,
    stars: partial.stars,
    forks: partial.forks,
    updated_at: partial.updated_at,
    subtitle: partial.subtitle,
  };
}

describe("tokenize", () => {
  test("splits camel and snake", () => {
    const doc = identifierTokens("AsyncSearchEngine parse_snake_case");
    expect(doc).toContain("async");
    expect(doc).toContain("search");
    expect(doc).toContain("engine");
    expect(doc).toContain("parse");
    expect(doc).toContain("snake");
  });
});

describe("bm25", () => {
  test("prefers dense matches", () => {
    const queryTokens = ["search", "engine"];
    const docs = [
      ["search", "engine", "search", "ranking", "engine"],
      ["engine"],
      ["unrelated"],
    ];
    const avgLen = docs.reduce((s, d) => s + d.length, 0) / docs.length;
    const df = documentFrequencies(docs, queryTokens);
    const dense = bm25Score(docs[0]!, queryTokens, avgLen, df, docs.length);
    const sparse = bm25Score(docs[1]!, queryTokens, avgLen, df, docs.length);
    expect(dense).toBeGreaterThan(sparse + 0.2);
  });
});

describe("applyExperimentalRanking", () => {
  test("text-dense low-star beats popular unrelated", () => {
    const results = [
      hit({
        title: "README.md",
        repository: "mega/stars-only",
        snippet: "unrelated documentation",
        stars: 50000,
        score: 50,
      }),
      hit({
        title: "src/search_engine.rs",
        repository: "small/search-engine",
        snippet: "search engine ranking bm25",
        stars: 12,
        score: 5,
      }),
    ];
    const ranked = applyExperimentalRanking(results, "search engine ranking");
    expect(ranked[0]!.repository).toBe("small/search-engine");
    expect(ranked[0]!.score).toBeGreaterThan(ranked[1]!.score);
  });

  test("identifier match scores camel query", () => {
    const doc = identifierTokens("AsyncSearchEngine");
    const q = tokenizeWithIdents("async_search");
    expect(identifierMatchScore(doc, q)).toBeGreaterThan(0);
  });
});
