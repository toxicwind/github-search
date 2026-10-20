/** Port of crates/core RankWeights (5a70003 RELEVANCE-FIRST). */

export const FEATURE_DIM = 14;

export interface RankWeights {
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

export function baselineWeights(): RankWeights {
  return {
    base: 1.0,
    stars: 1.0,
    recency: 1.0,
    text_match: 1.0,
    readability: 1.0,
    fusion: 0.8,
    context: 0.8,
    rarity: 0.6,
    bm25: 1.0,
    identifier: 1.0,
    popularity: 1.0,
    language_affinity: 0.7,
    commit_recency: 0.9,
    ml: 1.0,
  };
}

/** RELEVANCE FIRST: text_match=3.5, bm25=3.0, popularity=0.4, stars=0.3 */
export function experimentalDefaultWeights(): RankWeights {
  return {
    base: 0.5,
    stars: 0.3,
    recency: 0.8,
    text_match: 3.5,
    readability: 0.5,
    fusion: 0.3,
    context: 0.6,
    rarity: 0.3,
    bm25: 3.0,
    identifier: 1.2,
    popularity: 0.4,
    language_affinity: 1.0,
    commit_recency: 0.7,
    ml: 1.0,
  };
}

export function weightsAsVector(w: RankWeights): number[] {
  return [
    w.base,
    w.stars,
    w.recency,
    w.text_match,
    w.readability,
    w.fusion,
    w.context,
    w.rarity,
    w.bm25,
    w.identifier,
    w.popularity,
    w.language_affinity,
    w.commit_recency,
    w.ml,
  ];
}
