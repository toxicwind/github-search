/**
 * applyExperimentalRanking — Bun port of ranking.rs apply_experimental_ranking
 * (epoch 5a70003 RELEVANCE-FIRST weights).
 */
import type { SearchResult } from "@ghas/contracts";
import {
  experimentalDefaultWeights,
  type RankWeights,
  weightsAsVector,
} from "./weights.ts";
import { identifierTokens, tokenizeWithIdents } from "./tokenize.ts";
import {
  bm25Score,
  commitRecencyBonus,
  documentFrequencies,
  identifierMatchScore,
  popularityBonus,
} from "./bm25.ts";
import {
  detectQueryLanguage,
  languageAffinityBonus,
} from "./language.ts";

export interface ScoreBreakdown {
  base: number;
  stars: number;
  recency: number;
  text_match: number;
  readability: number;
  fusion: number;
  context: number;
  rarity: number;
  bm25: number;
  identifier: number;
  popularity: number;
  language_affinity: number;
  commit_recency: number;
  ml: number;
}

function emptyBreakdown(): ScoreBreakdown {
  return {
    base: 0,
    stars: 0,
    recency: 0,
    text_match: 0,
    readability: 0,
    fusion: 0,
    context: 0,
    rarity: 0,
    bm25: 0,
    identifier: 0,
    popularity: 0,
    language_affinity: 0,
    commit_recency: 0,
    ml: 0,
  };
}

function featureVector(b: ScoreBreakdown): number[] {
  return [
    b.base,
    b.stars,
    b.recency,
    b.text_match,
    b.readability,
    b.fusion,
    b.context,
    b.rarity,
    b.bm25,
    b.identifier,
    b.popularity,
    b.language_affinity,
    b.commit_recency,
    b.ml,
  ];
}

export function weightedTotal(
  breakdown: ScoreBreakdown,
  weights: RankWeights,
): number {
  const feats = featureVector(breakdown);
  const w = weightsAsVector(weights);
  let raw = 0;
  for (let i = 0; i < feats.length; i++) raw += feats[i]! * w[i]!;
  return Math.min(100, Math.max(0, raw));
}

function collectDocText(r: SearchResult): string {
  return [r.title, r.subtitle ?? "", r.path ?? "", r.snippet ?? ""].join(" ");
}

function textMatchScore(queryTokens: string[], docTokens: string[]): number {
  if (!queryTokens.length) return 0;
  const set = new Set(docTokens);
  const hits = queryTokens.filter((t) => set.has(t)).length;
  return Math.min(10, (hits / queryTokens.length) * 10);
}

export type ApplyRankingOptions = {
  weights?: RankWeights;
  localLang?: string;
  /** Preserve Blackbird list order as a weak base prior (index 0 → higher). */
  listPositionPrior?: boolean;
};

/**
 * Re-score and sort results with RELEVANCE-FIRST weights.
 * Mutates scores; returns the same array sorted desc.
 */
export function applyExperimentalRanking(
  results: SearchResult[],
  query: string,
  options: ApplyRankingOptions = {},
): SearchResult[] {
  if (!results.length) return results;
  const queryTokens = tokenizeWithIdents(query);
  if (!queryTokens.length) return results;

  const weights = options.weights ?? experimentalDefaultWeights();
  const docs = results.map((r) => identifierTokens(collectDocText(r)));
  const avgLen =
    docs.reduce((s, d) => s + d.length, 0) / Math.max(docs.length, 1) || 1;
  const df = documentFrequencies(docs, queryTokens);
  const docCount = docs.length;
  const queryLang = detectQueryLanguage(query);

  for (let i = 0; i < results.length; i++) {
    const result = results[i]!;
    const docTokens = docs[i]!;
    const breakdown = emptyBreakdown();

    // Keep engine/list prior without drowning text relevance.
    // Stronger Blackbird/UI list prior (UI compare 2026-07): 0.15 was too weak
    // and reordered serpl/gmilano away from github.com/search type=code.
    if (options.listPositionPrior) {
      breakdown.base = Math.max(0, (100 - i) * 0.45);
    } else {
      breakdown.base = Math.min(40, Number(result.score) || 0) * 0.25;
    }
    breakdown.stars = Math.min(
      10,
      Math.log1p(Number(result.stars ?? 0)),
    );
    breakdown.recency = commitRecencyBonus(result.updated_at) * 0.25;
    breakdown.text_match = textMatchScore(queryTokens, docTokens);
    breakdown.bm25 = bm25Score(
      docTokens,
      queryTokens,
      avgLen,
      df,
      docCount,
    );
    breakdown.identifier = identifierMatchScore(docTokens, queryTokens);
    breakdown.popularity = popularityBonus(result.stars, result.forks);
    breakdown.language_affinity = languageAffinityBonus(
      queryLang,
      options.localLang,
      result.language,
    );
    breakdown.commit_recency = commitRecencyBonus(result.updated_at);

    const total = weightedTotal(breakdown, weights);
    result.score = total;
    result.latentScore = Math.min(99, Math.round(total));
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

/** Env: GHAS_EXPERIMENTAL_RANK=0 disables; default on. */
export function experimentalRankEnabled(): boolean {
  const v = process.env.GHAS_EXPERIMENTAL_RANK;
  if (v === "0" || v === "false" || v === "off") return false;
  return true;
}
