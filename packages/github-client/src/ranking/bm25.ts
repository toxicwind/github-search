/** BM25 + identifier/popularity helpers (from ranking.rs 5a70003). */

export function documentFrequencies(
  docs: string[][],
  queryTokens: string[],
): Map<string, number> {
  const df = new Map<string, number>();
  for (const doc of docs) {
    const unique = new Set(doc);
    for (const token of queryTokens) {
      if (unique.has(token)) {
        df.set(token, (df.get(token) ?? 0) + 1);
      }
    }
  }
  return df;
}

export function bm25Score(
  docTokens: string[],
  queryTokens: string[],
  avgLen: number,
  df: Map<string, number>,
  docCount: number,
): number {
  const k1 = 1.6;
  const b = 0.75;
  const docLen = Math.max(docTokens.length, 1);
  let score = 0;
  for (const token of queryTokens) {
    const tf = docTokens.filter((t) => t === token).length;
    if (tf === 0) continue;
    const freq = df.get(token) ?? 1;
    const idf = Math.max(
      0,
      Math.log((docCount - freq + 0.5) / (freq + 0.5)),
    );
    const denom = tf + k1 * (1 - b + b * (docLen / Math.max(avgLen, 1)));
    score += idf * ((tf * (k1 + 1)) / denom);
  }
  return Math.min(score, 12);
}

export function identifierMatchScore(
  docTokens: string[],
  queryTokens: string[],
): number {
  if (!docTokens.length || !queryTokens.length) return 0;
  const docSet = new Set(docTokens);
  const hits = queryTokens.filter((t) => docSet.has(t)).length;
  const coverage = hits / queryTokens.length;
  return Math.min(hits * 0.9 + coverage * 2.0, 10);
}

export function popularityBonus(
  stars: number | undefined,
  forks: number | undefined,
): number {
  const starTerm = stars != null ? Math.log1p(stars) : 0;
  const forkTerm = forks != null ? Math.log1p(forks) : 0;
  return Math.min(starTerm * 0.7 + forkTerm * 0.3, 10);
}

export function commitRecencyBonus(updatedAt: string | undefined): number {
  if (!updatedAt) return 0;
  const ms = Date.parse(updatedAt);
  if (Number.isNaN(ms)) return 0;
  const ageDays = Math.max(0, (Date.now() - ms) / 86400000);
  const freshness = Math.max(0, 180 - ageDays) / 180;
  return freshness * 8;
}
