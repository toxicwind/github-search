use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::Path;

use anyhow::Result;
use chrono::{DateTime, Utc};
use moka::sync::Cache;
use once_cell::sync::Lazy;
use rand::seq::SliceRandom;
use seahash::hash;
use serde::{Deserialize, Serialize};

use crate::{ScoreBreakdown, SearchResult, FEATURE_DIM};

static QUERY_TOKEN_CACHE: Lazy<Cache<u64, Vec<String>>> =
    Lazy::new(|| Cache::builder().max_capacity(5_000).build());
static DOC_TOKEN_CACHE: Lazy<Cache<u64, Vec<String>>> =
    Lazy::new(|| Cache::builder().max_capacity(10_000).build());

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct RankWeights {
    pub base: f64,
    pub stars: f64,
    pub recency: f64,
    pub text_match: f64,
    pub readability: f64,
    pub fusion: f64,
    pub context: f64,
    pub rarity: f64,
    pub bm25: f64,
    pub identifier: f64,
    pub popularity: f64,
    pub language_affinity: f64,
    pub commit_recency: f64,
    pub ml: f64,
}

impl RankWeights {
    pub fn baseline() -> Self {
        // Close to legacy "sum of parts" behaviour.
        Self {
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
        }
    }

    pub fn experimental_default() -> Self {
        // RELEVANCE FIRST: Text match and BM25 dominate.
        // A result that matches the query terms is far more valuable than a popular repo that doesn't.
        Self {
            base: 0.5,
            stars: 0.3,           // Reduced: popularity shouldn't dominate relevance
            recency: 0.8,
            text_match: 3.5,      // Boosted: query terms in title/content are critical
            readability: 0.5,
            fusion: 0.3,
            context: 0.6,
            rarity: 0.3,
            bm25: 3.0,            // Boosted: term frequency in snippets is key
            identifier: 1.2,
            popularity: 0.4,      // Reduced: don't let stars/forks drown out text matches
            language_affinity: 1.0,
            commit_recency: 0.7,
            ml: 1.0,
        }
    }

    pub fn as_vector(&self) -> [f64; FEATURE_DIM] {
        [
            self.base,
            self.stars,
            self.recency,
            self.text_match,
            self.readability,
            self.fusion,
            self.context,
            self.rarity,
            self.bm25,
            self.identifier,
            self.popularity,
            self.language_affinity,
            self.commit_recency,
            self.ml,
        ]
    }

    pub fn from_vector(vec: [f64; FEATURE_DIM]) -> Self {
        Self {
            base: vec[0],
            stars: vec[1],
            recency: vec[2],
            text_match: vec[3],
            readability: vec[4],
            fusion: vec[5],
            context: vec[6],
            rarity: vec[7],
            bm25: vec[8],
            identifier: vec[9],
            popularity: vec[10],
            language_affinity: vec[11],
            commit_recency: vec[12],
            ml: vec[13],
        }
    }

    pub fn normalize(self) -> Self {
        let vec = self.as_vector();
        let sum: f64 = vec.iter().copied().sum();
        if sum == 0.0 {
            return self;
        }
        let target = FEATURE_DIM as f64; // Keep mean weight close to 1.0
        let scaled = vec.map(|w| w * target / sum);
        Self::from_vector(scaled)
    }
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LabeledSample {
    pub breakdown: ScoreBreakdown,
    /// Relevance label on a 0–100 scale.
    pub relevance: f64,
}

#[derive(Clone, Debug)]
pub struct WeightTuningPipeline {
    pub learning_rate: f64,
    pub iterations: usize,
    pub regularization: f64,
    pub holdout_ratio: f64,
}

impl Default for WeightTuningPipeline {
    fn default() -> Self {
        Self {
            learning_rate: 0.03,
            iterations: 120,
            regularization: 0.02,
            holdout_ratio: 0.2,
        }
    }
}

impl WeightTuningPipeline {
    pub fn tune(&self, samples: &[LabeledSample], seed: RankWeights) -> (RankWeights, f64) {
        if samples.is_empty() {
            return (seed, 0.0);
        }

        let (train, val) = self.split_samples(samples);
        let mut weights = seed.as_vector();
        let mut best = weights;
        let mut best_rmse = f64::MAX;

        for _ in 0..self.iterations {
            let grad = self.gradient(&train, &weights);
            for i in 0..FEATURE_DIM {
                weights[i] = (weights[i] - self.learning_rate * grad[i]).max(0.0);
            }
            let rmse = self.rmse(&val, &weights);
            if rmse < best_rmse {
                best_rmse = rmse;
                best = weights;
            }
        }

        (RankWeights::from_vector(best).normalize(), best_rmse)
    }

    fn split_samples(&self, samples: &[LabeledSample]) -> (Vec<LabeledSample>, Vec<LabeledSample>) {
        if samples.len() < 3 {
            return (samples.to_vec(), samples.to_vec());
        }
        let mut shuffled = samples.to_vec();
        let mut rng = rand::thread_rng();
        shuffled.shuffle(&mut rng);
        let split = ((shuffled.len() as f64) * (1.0 - self.holdout_ratio))
            .round()
            .clamp(1.0, (shuffled.len() - 1) as f64) as usize;
        let val = shuffled.split_off(split);
        (shuffled, val)
    }

    fn gradient(
        &self,
        samples: &[LabeledSample],
        weights: &[f64; FEATURE_DIM],
    ) -> [f64; FEATURE_DIM] {
        let mut grad = [0.0; FEATURE_DIM];
        if samples.is_empty() {
            return grad;
        }
        for sample in samples {
            let feats = sample.breakdown.feature_vector();
            let pred: f64 = feats.iter().zip(weights.iter()).map(|(f, w)| f * w).sum();
            let error = pred - sample.relevance;
            for i in 0..FEATURE_DIM {
                grad[i] += error * feats[i];
            }
        }
        for i in 0..FEATURE_DIM {
            grad[i] = grad[i] / samples.len() as f64 + self.regularization * weights[i];
        }
        grad
    }

    fn rmse(&self, samples: &[LabeledSample], weights: &[f64; FEATURE_DIM]) -> f64 {
        if samples.is_empty() {
            return 0.0;
        }
        let mse: f64 = samples
            .iter()
            .map(|s| {
                let feats = s.breakdown.feature_vector();
                let pred: f64 = feats.iter().zip(weights.iter()).map(|(f, w)| f * w).sum();
                let err = pred - s.relevance;
                err * err
            })
            .sum::<f64>()
            / samples.len() as f64;
        mse.sqrt()
    }
}

pub fn load_samples(path: &Path) -> Result<Vec<LabeledSample>> {
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = fs::read_to_string(path)?;
    let parsed: Vec<LabeledSample> = serde_json::from_str(&data)?;
    Ok(parsed)
}

pub fn persist_weights(path: &Path, weights: &RankWeights) -> Result<()> {
    let data = serde_json::to_string_pretty(weights)?;
    fs::write(path, data)?;
    Ok(())
}

pub fn apply_experimental_ranking(
    results: &mut [SearchResult],
    query: &str,
    weights: &RankWeights,
    local_lang: Option<&str>,
) {
    if results.is_empty() {
        return;
    }
    let query_tokens = tokenize_query_cached(query);
    if query_tokens.is_empty() {
        return;
    }

    let docs: Vec<Vec<String>> = results
        .iter()
        .map(|r| doc_tokens_cached(&collect_doc_text(r)))
        .collect();

    let avg_len =
        docs.iter().map(|d| d.len() as f64).sum::<f64>().max(1.0) / docs.len().max(1) as f64;
    let df = document_frequencies(&docs, &query_tokens);
    let doc_count = docs.len();
    let query_lang = detect_query_language(query);

    for (result, doc_tokens) in results.iter_mut().zip(docs.iter()) {
        let bm25 = bm25_score(doc_tokens, &query_tokens, avg_len, &df, doc_count);
        let identifier = identifier_match_score(doc_tokens, &query_tokens);
        let popularity = popularity_bonus(result.stars, result.forks);
        
        // Check both query explicit language AND local context
        let lang_bonus = language_affinity_bonus(query_lang.as_deref(), local_lang, result.language.as_deref());
        
        let commit_bonus = commit_recency_bonus(result.updated_at.as_ref());

        result.score_breakdown.bm25 = bm25;
        result.score_breakdown.identifier = identifier;
        result.score_breakdown.popularity = popularity;
        result.score_breakdown.language_affinity = lang_bonus;
        result.score_breakdown.commit_recency = commit_bonus;
        result.score = result.score_breakdown.weighted_total(weights);
    }

    results.sort_by(SearchResult::by_score_desc);
}

fn tokenize_with_idents(query: &str) -> Vec<String> {
    query
        .split(|c: char| !c.is_alphanumeric() && c != '+' && c != '#')
        .flat_map(split_identifier)
        .filter(|s| s.len() > 1)
        .map(|s| s.to_lowercase())
        .collect()
}

fn tokenize_query_cached(query: &str) -> Vec<String> {
    let key = hash(query.as_bytes());
    if let Some(tokens) = QUERY_TOKEN_CACHE.get(&key) {
        return tokens;
    }
    let tokens = tokenize_with_idents(query);
    if !tokens.is_empty() {
        QUERY_TOKEN_CACHE.insert(key, tokens.clone());
    }
    tokens
}

fn identifier_tokens(text: &str) -> Vec<String> {
    text.split(|c: char| !c.is_alphanumeric() && c != '_')
        .flat_map(split_identifier)
        .filter(|s| s.len() > 1)
        .map(|s| s.to_lowercase())
        .collect()
}

fn doc_tokens_cached(text: &str) -> Vec<String> {
    let key = hash(text.as_bytes());
    if let Some(tokens) = DOC_TOKEN_CACHE.get(&key) {
        return tokens;
    }
    let tokens = identifier_tokens(text);
    if !tokens.is_empty() {
        DOC_TOKEN_CACHE.insert(key, tokens.clone());
    }
    tokens
}

fn split_identifier(token: &str) -> Vec<String> {
    let mut parts = Vec::new();
    for chunk in token.split('_') {
        if chunk.is_empty() {
            continue;
        }
        let mut buf = String::new();
        for ch in chunk.chars() {
            let is_boundary = ch.is_uppercase()
                && !buf.is_empty()
                && buf
                    .chars()
                    .last()
                    .map(|prev| prev.is_lowercase())
                    .unwrap_or(false);
            if is_boundary {
                parts.push(buf.to_lowercase());
                buf.clear();
            }
            buf.push(ch);
        }
        if !buf.is_empty() {
            parts.push(buf.to_lowercase());
        }
    }
    parts
}

fn document_frequencies(docs: &[Vec<String>], query_tokens: &[String]) -> HashMap<String, usize> {
    let mut df = HashMap::new();
    for doc in docs {
        let unique: HashSet<&String> = doc.iter().collect();
        for token in query_tokens {
            if unique.contains(token) {
                *df.entry(token.clone()).or_insert(0) += 1;
            }
        }
    }
    df
}

fn bm25_score(
    doc_tokens: &[String],
    query_tokens: &[String],
    avg_len: f64,
    df: &HashMap<String, usize>,
    doc_count: usize,
) -> f64 {
    let k1 = 1.6;
    let b = 0.75;
    let doc_len = doc_tokens.len().max(1) as f64;
    let mut score = 0.0;
    for token in query_tokens {
        let tf = doc_tokens.iter().filter(|t| *t == token).count() as f64;
        if tf == 0.0 {
            continue;
        }
        let freq = *df.get(token).unwrap_or(&1) as f64;
        let idf = ((doc_count as f64 - freq + 0.5) / (freq + 0.5))
            .ln()
            .max(0.0);
        let denom = tf + k1 * (1.0 - b + b * (doc_len / avg_len.max(1.0)));
        score += idf * (tf * (k1 + 1.0) / denom);
    }
    score.min(12.0)
}

fn identifier_match_score(doc_tokens: &[String], query_tokens: &[String]) -> f64 {
    if doc_tokens.is_empty() || query_tokens.is_empty() {
        return 0.0;
    }
    let doc_set: HashSet<&String> = doc_tokens.iter().collect();
    let hits = query_tokens.iter().filter(|t| doc_set.contains(t)).count() as f64;
    let coverage = hits / query_tokens.len() as f64;
    ((hits * 0.9) + coverage * 2.0).min(10.0)
}

fn popularity_bonus(stars: Option<u64>, forks: Option<u64>) -> f64 {
    let star_term = stars.map(|s| (s as f64).ln_1p()).unwrap_or(0.0);
    let fork_term = forks.map(|f| (f as f64).ln_1p()).unwrap_or(0.0);
    (star_term * 0.7 + fork_term * 0.3).min(10.0)
}

pub fn detect_query_language(query: &str) -> Option<String> {
    let lower = query.to_lowercase();
    if lower.contains("c++") {
        return Some("C++".into());
    }
    let language_map = [
        ("rust", "Rust"),
        ("golang", "Go"),
        ("go", "Go"),
        ("python", "Python"),
        ("py", "Python"),
        ("typescript", "TypeScript"),
        ("ts", "TypeScript"),
        ("javascript", "JavaScript"),
        ("js", "JavaScript"),
        ("java", "Java"),
        ("kotlin", "Kotlin"),
        ("swift", "Swift"),
        ("cpp", "C++"),
        ("cxx", "C++"),
        ("c#", "C#"),
        ("csharp", "C#"),
        ("ruby", "Ruby"),
        ("rb", "Ruby"),
        ("php", "PHP"),
        ("scala", "Scala"),
        ("elixir", "Elixir"),
        ("haskell", "Haskell"),
        ("dart", "Dart"),
    ];
    for (needle, lang) in language_map {
        if lower
            .split(|c: char| !c.is_alphanumeric() && c != '#')
            .any(|part| part == needle)
        {
            return Some(lang.to_string());
        }
    }
    None
}

fn language_affinity_bonus(
    query_lang: Option<&str>,
    local_lang: Option<&str>,
    result_lang: Option<&str>,
) -> f64 {
    let r_lang = match result_lang {
        Some(l) => l,
        None => return 0.0,
    };

    // 1. Query Language Match (Strongest Signal)
    if let Some(q_lang) = query_lang {
        if q_lang.eq_ignore_ascii_case(r_lang) {
            return 5.0; // Boosted from 4.0
        }
    }

    // 2. Local Context Match (Implicit Signal)
    if let Some(l_lang) = local_lang {
        if l_lang.eq_ignore_ascii_case(r_lang) {
            return 3.0; // Moderate boost
        }
    }

    0.0
}



fn commit_recency_bonus(updated_at: Option<&DateTime<Utc>>) -> f64 {
    updated_at
        .map(|dt| {
            let age_days = (Utc::now() - *dt).num_days().max(0) as f64;
            let freshness = (180.0 - age_days).max(0.0) / 180.0;
            freshness * 8.0
        })
        .unwrap_or(0.0)
}

fn collect_doc_text(result: &SearchResult) -> String {
    format!(
        "{} {} {} {}",
        result.title,
        result.subtitle.as_deref().unwrap_or(""),
        result.path.as_deref().unwrap_or(""),
        result.snippet.as_deref().unwrap_or("")
    )
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn bm25_prefers_dense_matches() {
        let query_tokens = vec!["search".into(), "engine".into()];
        let docs = vec![
            vec![
                "search".into(),
                "engine".into(),
                "search".into(),
                "ranking".into(),
                "engine".into(),
            ],
            vec!["engine".into()],
            vec!["unrelated".into()],
        ];
        let avg_len = docs.iter().map(|d| d.len() as f64).sum::<f64>() / docs.len().max(1) as f64;
        let df = document_frequencies(&docs, &query_tokens);
        let score_dense = bm25_score(&docs[0], &query_tokens, avg_len, &df, docs.len());
        let score_sparse = bm25_score(&docs[1], &query_tokens, avg_len, &df, docs.len());
        assert!(score_dense > score_sparse + 0.2);
    }

    #[test]
    fn identifier_split_matches_camel_and_snake() {
        let doc_tokens = identifier_tokens("AsyncSearchEngine parse_snake_case");
        let query_tokens = tokenize_with_idents("async_search");
        let score = identifier_match_score(&doc_tokens, &query_tokens);
        assert!(doc_tokens.contains(&"async".to_string()));
        assert!(doc_tokens.contains(&"search".to_string()));
        assert!(score > 0.0);
    }

    #[test]
    fn weighted_scores_clamp_to_band() {
        let breakdown = ScoreBreakdown {
            base: 120.0,
            stars: 50.0,
            recency: 40.0,
            text_match: 30.0,
            readability: 25.0,
            fusion: 10.0,
            context: 5.0,
            rarity: 15.0,
            bm25: 12.0,
            identifier: 10.0,
            popularity: 20.0,
            language_affinity: 8.0,
            commit_recency: 8.0,
            ml: 10.0,
        };
        let weights = RankWeights::experimental_default();
        let total = breakdown.weighted_total(&weights);
        assert!((0.0..=100.0).contains(&total));
    }
}
