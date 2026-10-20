// Cycle 6: Temporal Pattern Analyzer
// Beyond-baseline: Detect trending topics and temporal patterns in search results

use std::collections::HashMap;
use chrono::{DateTime, Utc, Duration};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TemporalEvent {
    pub query: String,
    pub timestamp: DateTime<Utc>,
    pub result_count: usize,
}

#[derive(Serialize, Deserialize)]
pub struct TemporalAnalyzer {
    events: Vec<TemporalEvent>,
    // Duration doesn't serialize by default with serde in older chrono versions without features, 
    // but typically it works if features enabled. Alternatively we store seconds.
    // Let's store trend_window_days for serialization stability.
    trend_window_days: i64, 
}

impl TemporalAnalyzer {
    pub fn new(trend_window_days: i64) -> Self {
        Self {
            events: Vec::new(),
            trend_window_days,
        }
    }

    pub fn load(path: impl AsRef<Path>) -> anyhow::Result<Self> {
        let file = fs::File::open(path)?;
        let reader = std::io::BufReader::new(file);
        let analyzer = serde_json::from_reader(reader)?;
        Ok(analyzer)
    }

    pub fn save(&self, path: impl AsRef<Path>) -> anyhow::Result<()> {
        let file = fs::File::create(path)?;
        let writer = std::io::BufWriter::new(file);
        serde_json::to_writer_pretty(writer, self)?;
        Ok(())
    }

    pub fn record_search(&mut self, query: String, result_count: usize) {
        self.events.push(TemporalEvent {
            query,
            timestamp: Utc::now(),
            result_count,
        });
        
        // Cleanup old events
        let window = Duration::days(self.trend_window_days);
        let cutoff = Utc::now() - window;
        self.events.retain(|e| e.timestamp > cutoff);
    }

    // Detect trending queries (increasing search frequency)
    pub fn detect_trends(&self) -> Vec<(String, f64)> {
        let mut query_counts: HashMap<String, Vec<DateTime<Utc>>> = HashMap::new();
        
        for event in &self.events {
            query_counts
                .entry(event.query.clone())
                .or_insert_with(Vec::new)
                .push(event.timestamp);
        }

        let mut trends = Vec::new();
        let now = Utc::now();
        let trend_window = Duration::days(self.trend_window_days);
        let half_window = trend_window / 2;

        for (query, timestamps) in query_counts {
            let recent_count = timestamps.iter()
                .filter(|t| now - **t < half_window)
                .count();
            let older_count = timestamps.iter()
                .filter(|t| {
                    let age = now - **t;
                    age >= half_window && age < trend_window
                })
                .count();

            if older_count > 0 {
                let trend_score = recent_count as f64 / older_count as f64;
                if trend_score > 1.5 {
                    trends.push((query, trend_score));
                }
            }
        }

        trends.sort_by(|a, b| b.1.partial_cmp(&a.1).unwrap());
        trends
    }

    // Find cyclical patterns (queries that repeat at intervals)
    pub fn detect_cycles(&self) -> Vec<(String, Duration)> {
        let mut query_intervals: HashMap<String, Vec<Duration>> = HashMap::new();

        for event in &self.events {
            let same_query_events: Vec<&TemporalEvent> = self.events
                .iter()
                .filter(|e| e.query == event.query && e.timestamp != event.timestamp)
                .collect();

            for other in same_query_events {
                let interval = if event.timestamp > other.timestamp {
                    event.timestamp - other.timestamp
                } else {
                    other.timestamp - event.timestamp
                };

                query_intervals
                    .entry(event.query.clone())
                    .or_insert_with(Vec::new)
                    .push(interval);
            }
        }

        let mut cycles = Vec::new();
        for (query, intervals) in query_intervals {
            if intervals.len() >= 3 {
                // Check if intervals are roughly consistent
                let avg_interval = Duration::seconds(
                    intervals.iter().map(|d| d.num_seconds()).sum::<i64>() / intervals.len() as i64
                );
                cycles.push((query, avg_interval));
            }
        }

        cycles
    }
}
