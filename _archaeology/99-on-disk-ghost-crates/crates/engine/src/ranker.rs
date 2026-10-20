use crate::types::{InputItem, RankedItem};

// Weight constants matching Rust ml_ranker defaults
const W_TEXT: f64 = 0.20;
const W_STARS: f64 = 0.15;
const W_RECENCY: f64 = 0.10;
const W_IDENTIFIER: f64 = 0.09;
const W_POPULARITY: f64 = 0.05;
const W_COMMIT: f64 = 0.05;
const W_LANG: f64 = 0.05;
const W_BM25: f64 = 0.14;
const W_QUALITY: f64 = 0.12;
const W_ENGAGEMENT: f64 = 0.05;

pub struct MlRanker;

impl MlRanker {
    pub fn rank(query: &str, items: Vec<InputItem>) -> Vec<RankedItem> {
        let query_lower = query.to_lowercase();
        let query_words: Vec<&str> = query_lower.split_whitespace().collect();
        let now = chrono::Utc::now();

        let mut ranked: Vec<RankedItem> = items
            .into_iter()
            .map(|item| Self::score_item(&query_lower, &query_words, &now, item))
            .collect();

        ranked.sort_by(|a, b| {
            b.score
                .partial_cmp(&a.score)
                .unwrap_or(std::cmp::Ordering::Equal)
        });
        ranked
    }

    fn score_item(
        query_lower: &str,
        query_words: &[&str],
        now: &chrono::DateTime<chrono::Utc>,
        item: InputItem,
    ) -> RankedItem {
        // Extract everything that needs move BEFORE any borrows
        let path_clone = item.path.clone();
        let path_ref = item.path.as_deref();
        let name: Option<String> = item
            .name
            .clone()
            .or_else(|| path_clone.and_then(|p| p.rsplit('/').next().map(|s| s.to_string())));
        let name_lower = name
            .as_deref()
            .map(|n| n.to_lowercase())
            .unwrap_or_default();
        let repo_full_name = item.repository.as_ref().and_then(|r| r.full_name.clone());
        let language = item.language.clone();
        let github_score = item.score.unwrap_or(0.0);
        let html_url = item.html_url.clone();

        // ── Text match ────────────────────────────────────────────
        let text_match = Self::compute_text_match(query_lower, query_words, &name_lower, &item);

        // ── Stars ─────────────────────────────────────────────────
        let stars = item
            .stargazers_count
            .or(item.repository.as_ref().and_then(|r| r.stargazers_count))
            .unwrap_or(0) as f64;
        let star_score = (stars / 250.0).min(10.0);

        // ── Recency ───────────────────────────────────────────────
        let recency_days = item
            .updated_at
            .as_ref()
            .and_then(|ts| chrono::DateTime::parse_from_rfc3339(ts).ok())
            .map(|dt| (now.signed_duration_since(dt)).num_hours() as f64 / 24.0)
            .unwrap_or(365.0);

        let recency_score = if recency_days < 7.0 {
            10.0
        } else if recency_days < 30.0 {
            8.0
        } else if recency_days < 90.0 {
            5.0
        } else {
            ((365.0 - recency_days) / 36.5).max(0.0)
        };

        // ── Identifier match ──────────────────────────────────────
        let identifier_score = Self::compute_identifier(query_words, &name_lower, path_ref);

        // ── BM25 proxy ────────────────────────────────────────────
        let bm25 = text_match * 0.6;

        // ── Compound ML score ─────────────────────────────────────
        let ml_score = text_match * W_TEXT
            + star_score * W_STARS
            + recency_score * W_RECENCY
            + identifier_score * W_IDENTIFIER
            + (stars / 1000.0).min(10.0) * W_POPULARITY
            + (if recency_days < 30.0 { 10.0 } else { 0.0 }) * W_COMMIT
            + (if language.is_some() { 1.0 } else { 0.0 }) * W_LANG
            + bm25 * W_BM25
            + 5.0 * W_QUALITY
            + (stars / 500.0).min(5.0) * W_ENGAGEMENT;

        let composite = github_score * 0.4 + ml_score * 0.6;

        let evaluation = if composite > 80.0 {
            "EXCEPTIONAL_MATCH"
        } else if composite > 50.0 {
            "HIGH_MATCH"
        } else if composite > 30.0 {
            "STRUCTURAL_MATCH"
        } else {
            "LOW_MATCH"
        };

        RankedItem {
            name,
            path: item.path,
            html_url,
            repository: repo_full_name,
            score: composite,
            ml_score,
            text_match,
            star_score,
            recency_score,
            language,
            evaluation: evaluation.into(),
            is_emergent: composite > 50.0,
        }
    }

    fn compute_text_match(
        query_lower: &str,
        query_words: &[&str],
        name_lower: &str,
        item: &InputItem,
    ) -> f64 {
        let mut score = 0.0;

        if let Some(ref tm) = item.text_matches {
            for m in tm {
                if let Some(ref frag) = m.fragment {
                    let fl = frag.to_lowercase();
                    score += fl.matches(query_lower).count() as f64 * 10.0;
                    for w in query_words {
                        if fl.contains(w) {
                            score += 5.0;
                        }
                    }
                }
            }
        }

        if name_lower.contains(query_lower) {
            score += 20.0;
        }

        score
    }

    fn compute_identifier(query_words: &[&str], name_lower: &str, path: Option<&str>) -> f64 {
        let mut score = 0.0;

        for token in query_words {
            if name_lower.contains(token) {
                score += 8.0;
            }
            if let Some(p) = path {
                if p.to_lowercase().contains(token) {
                    score += 4.0;
                }
            }
        }

        score
    }
}
