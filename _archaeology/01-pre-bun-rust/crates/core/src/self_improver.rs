use std::collections::HashSet;
use std::fs::{self, File, OpenOptions};
use std::io::{BufRead, BufReader, Write};
use std::path::{Path, PathBuf};

use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use thiserror::Error;

pub const LINEAGE_LOG: &str = "target/hb-gh-search-lineage.jsonl";
pub const METRICS_DIR: &str = "target/hb-gh-search-metrics";
pub const DEFAULT_NOVELTY_THRESHOLD: f64 = 0.5;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MetricEntry {
    pub benchmark: String,
    pub query_shape: String,
    pub latency_ms: f64,
    pub result_count: u32,
    pub quality_score: Option<f64>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct MetricsSnapshot {
    pub variant_id: String,
    pub recorded_at: DateTime<Utc>,
    pub entries: Vec<MetricEntry>,
}

impl MetricsSnapshot {
    pub fn path_for(variant_id: &str) -> PathBuf {
        Path::new(METRICS_DIR).join(format!("{variant_id}.json"))
    }

    pub fn save(&self) -> Result<PathBuf, SelfImproverError> {
        fs::create_dir_all(METRICS_DIR)?;
        let path = Self::path_for(&self.variant_id);
        let file = File::create(&path)?;
        serde_json::to_writer_pretty(file, self)?;
        Ok(path)
    }

    pub fn load(path: impl AsRef<Path>) -> Result<Self, SelfImproverError> {
        let file = File::open(path)?;
        Ok(serde_json::from_reader(file)?)
    }

    pub fn average_quality(&self) -> Option<f64> {
        let mut sum = 0.0;
        let mut count = 0.0;
        for entry in &self.entries {
            if let Some(q) = entry.quality_score {
                sum += q;
                count += 1.0;
            }
        }
        if count > 0.0 {
            Some(sum / count)
        } else {
            None
        }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, Default)]
pub struct NoveltyDescriptor {
    pub ranking_signals: Vec<String>,
    pub http_capabilities: Vec<String>,
    pub ux_capabilities: Vec<String>,
}

impl NoveltyDescriptor {
    pub fn distance(&self, other: &Self) -> f64 {
        let rank_delta = symmetric_difference(&self.ranking_signals, &other.ranking_signals);
        let http_delta = symmetric_difference(&self.http_capabilities, &other.http_capabilities);
        let ux_delta = symmetric_difference(&self.ux_capabilities, &other.ux_capabilities);
        let total_slots = (self.ranking_signals.len()
            + other.ranking_signals.len()
            + self.http_capabilities.len()
            + other.http_capabilities.len()
            + self.ux_capabilities.len()
            + other.ux_capabilities.len())
        .max(1) as f64;
        (rank_delta + http_delta + ux_delta) as f64 / total_slots
    }

    pub fn tags(&self) -> Vec<String> {
        let mut tags = Vec::new();
        tags.extend(self.ranking_signals.iter().cloned());
        tags.extend(self.http_capabilities.iter().cloned());
        tags.extend(self.ux_capabilities.iter().cloned());
        tags
    }
}

fn symmetric_difference(left: &[String], right: &[String]) -> usize {
    let mut l: Vec<_> = left.iter().collect();
    let mut r: Vec<_> = right.iter().collect();
    l.sort();
    r.sort();
    let mut i = 0;
    let mut j = 0;
    let mut diff = 0;
    while i < l.len() && j < r.len() {
        if l[i] == r[j] {
            i += 1;
            j += 1;
        } else if l[i] < r[j] {
            diff += 1;
            i += 1;
        } else {
            diff += 1;
            j += 1;
        }
    }
    diff + (l.len() - i) + (r.len() - j)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VariantRecord {
    pub id: String,
    pub parent_id: Option<String>,
    pub timestamp: DateTime<Utc>,
    pub summary: String,
    pub metrics_path: Option<String>,
    pub novelty: NoveltyDescriptor,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct VariantBrief {
    pub id: String,
    pub parent_id: Option<String>,
    pub summary: String,
    pub timestamp: DateTime<Utc>,
    pub metrics_samples: usize,
    pub average_quality: Option<f64>,
    pub novelty_tags: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct SelfImproverState {
    pub variants: Vec<VariantBrief>,
    pub recommended_base: Option<String>,
    pub stagnating: bool,
    pub novelty_threshold: f64,
    pub underexplored_dimensions: Vec<String>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct AcceptanceDecision {
    pub keep: bool,
    pub quality_delta: f64,
    pub novelty_distance: f64,
    pub reason: String,
}

pub struct SelfImprover;

impl SelfImprover {
    pub fn load_lineage(path: &Path) -> Result<Vec<VariantRecord>, SelfImproverError> {
        if !path.exists() {
            return Ok(Vec::new());
        }
        let file = File::open(path)?;
        let reader = BufReader::new(file);
        let mut records = Vec::new();
        for line in reader.lines() {
            let line = line?;
            if line.trim().is_empty() {
                continue;
            }
            let record: VariantRecord = serde_json::from_str(&line)?;
            records.push(record);
        }
        Ok(records)
    }

    pub fn append_record(path: &Path, record: &VariantRecord) -> Result<(), SelfImproverError> {
        if let Some(parent) = path.parent() {
            if !parent.as_os_str().is_empty() {
                fs::create_dir_all(parent)?;
            }
        }
        let mut file = OpenOptions::new().create(true).append(true).open(path)?;
        let payload = serde_json::to_string(record)?;
        writeln!(file, "{}", payload)?;
        Ok(())
    }

    pub fn summarize(
        lineage_path: &Path,
        novelty_threshold: f64,
    ) -> Result<SelfImproverState, SelfImproverError> {
        let lineage = Self::load_lineage(lineage_path)?;
        let mut briefs = Vec::new();
        let mut best_id: Option<(String, f64, DateTime<Utc>)> = None;
        let mut history_quality = Vec::new();

        for record in &lineage {
            let (count, avg) = match &record.metrics_path {
                Some(path) => {
                    if Path::new(path).exists() {
                        let snapshot = MetricsSnapshot::load(path)?;
                        history_quality.push((record.id.clone(), snapshot.average_quality()));
                        (snapshot.entries.len(), snapshot.average_quality())
                    } else {
                        (0, None)
                    }
                }
                None => (0, None),
            };

            if let Some(avg_quality) = avg {
                match &best_id {
                    Some((_, best_avg, best_ts)) => {
                        if avg_quality > *best_avg
                            || (avg_quality == *best_avg && record.timestamp > *best_ts)
                        {
                            best_id = Some((record.id.clone(), avg_quality, record.timestamp));
                        }
                    }
                    None => {
                        best_id = Some((record.id.clone(), avg_quality, record.timestamp));
                    }
                }
            }

            briefs.push(VariantBrief {
                id: record.id.clone(),
                parent_id: record.parent_id.clone(),
                summary: record.summary.clone(),
                timestamp: record.timestamp,
                metrics_samples: count,
                average_quality: avg,
                novelty_tags: record.novelty.tags(),
            });
        }

        let recommended_base = best_id
            .map(|(id, _, _)| id)
            .or_else(|| briefs.last().map(|b| b.id.clone()));
        let stagnating = Self::is_stagnating(&lineage, novelty_threshold, 0.01);
        let underexplored = Self::infer_underexplored(&lineage);

        Ok(SelfImproverState {
            variants: briefs,
            recommended_base,
            stagnating,
            novelty_threshold,
            underexplored_dimensions: underexplored,
        })
    }

    pub fn evaluate_candidate(
        baseline: Option<&MetricsSnapshot>,
        candidate: &MetricsSnapshot,
        novelty_distance: f64,
        novelty_threshold: f64,
    ) -> AcceptanceDecision {
        let baseline_quality = baseline.and_then(|m| m.average_quality()).unwrap_or(0.0);
        let candidate_quality = candidate.average_quality().unwrap_or(0.0);
        let delta = candidate_quality - baseline_quality;
        let keep = delta >= 0.0 && novelty_distance >= novelty_threshold;
        let reason = if keep {
            format!("accepted: quality_delta={delta:.4} novelty_distance={novelty_distance:.2}")
        } else {
            format!("rejected: quality_delta={delta:.4} novelty_distance={novelty_distance:.2}")
        };
        AcceptanceDecision {
            keep,
            quality_delta: delta,
            novelty_distance,
            reason,
        }
    }

    fn is_stagnating(
        lineage: &[VariantRecord],
        novelty_threshold: f64,
        quality_epsilon: f64,
    ) -> bool {
        if lineage.len() < 2 {
            return false;
        }
        let last = &lineage[lineage.len() - 1];
        let prev = &lineage[lineage.len() - 2];
        let novelty = last.novelty.distance(&prev.novelty);
        if novelty >= novelty_threshold {
            return false;
        }
        let last_quality = last
            .metrics_path
            .as_ref()
            .and_then(|p| MetricsSnapshot::load(p).ok())
            .and_then(|m| m.average_quality())
            .unwrap_or(0.0);
        let prev_quality = prev
            .metrics_path
            .as_ref()
            .and_then(|p| MetricsSnapshot::load(p).ok())
            .and_then(|m| m.average_quality())
            .unwrap_or(0.0);
        (last_quality - prev_quality).abs() < quality_epsilon
    }

    fn infer_underexplored(lineage: &[VariantRecord]) -> Vec<String> {
        let mut observed = HashSet::new();
        for record in lineage {
            observed.extend(record.novelty.tags());
        }
        let targets = [
            "semantic-hybrid",
            "caching-layer",
            "rerank-openai",
            "result-clustering",
            "keyboard-first-ui",
        ];
        #[allow(clippy::unnecessary_to_owned)]
        targets
            .iter()
            .filter(|cap| !observed.contains(&cap.to_string()))
            .map(|cap| cap.to_string())
            .collect()
    }
}

#[derive(Debug, Error)]
pub enum SelfImproverError {
    #[error("io error: {0}")]
    Io(#[from] std::io::Error),
    #[error("serialization error: {0}")]
    Serde(#[from] serde_json::Error),
}
