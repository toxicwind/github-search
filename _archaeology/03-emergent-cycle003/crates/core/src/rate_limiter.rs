//! Smart request queue and rate limiter for GitHub API
//!
//! Implements intelligent request queuing that:
//! - Tracks GitHub API rate limit headers
//! - Prioritizes requests based on query complexity
//! - Batches regex expansion queries efficiently
//! - Auto-throttles when approaching limits

use std::sync::Arc;
use std::time::{Duration, Instant};
use tokio::sync::{Mutex, Semaphore};
use tracing::{debug, info, warn};

/// Priority levels for requests
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum RequestPriority {
    Low = 0,
    Normal = 1,
    High = 2,
    Critical = 3,
}

/// Request metadata for smart queuing
#[derive(Debug, Clone)]
pub struct RequestMetadata {
    pub query: String,
    pub priority: RequestPriority,
    pub is_regex_expansion: bool,
    pub expansion_count: usize,
    pub submitted_at: Instant,
}

/// GitHub API rate limit state
#[derive(Debug, Clone)]
pub struct RateLimitState {
    pub limit: u32,
    pub remaining: u32,
    pub reset_at: Instant,
    pub last_updated: Instant,
}

impl RateLimitState {
    pub fn new_unauthenticated() -> Self {
        Self {
            limit: 60,
            remaining: 60,
            reset_at: Instant::now() + Duration::from_secs(3600),
            last_updated: Instant::now(),
        }
    }

    pub fn new_authenticated() -> Self {
        Self {
            limit: 5000,
            remaining: 5000,
            reset_at: Instant::now() + Duration::from_secs(3600),
            last_updated: Instant::now(),
        }
    }

    /// Calculate percentage of rate limit remaining
    pub fn remaining_percent(&self) -> f64 {
        (self.remaining as f64 / self.limit as f64) * 100.0
    }

    /// Check if we should throttle based on remaining quota
    pub fn should_throttle(&self) -> bool {
        self.remaining_percent() < 10.0 // Throttle when below 10%
    }

    /// Get recommended delay before next request
    pub fn recommended_delay(&self) -> Duration {
        if self.remaining == 0 {
            // Out of quota - wait until reset
            self.reset_at.duration_since(Instant::now())
        } else if self.remaining_percent() < 5.0 {
            // Very low quota - aggressive throttling
            Duration::from_secs(10)
        } else if self.remaining_percent() < 10.0 {
            // Low quota - moderate throttling
            Duration::from_secs(5)
        } else if self.remaining_percent() < 20.0 {
            // Getting low - light throttling
            Duration::from_secs(1)
        } else {
            // Plenty of quota - no delay
            Duration::from_millis(100)
        }
    }
}

/// Smart request queue with rate limiting and prioritization
#[derive(Clone)]
pub struct SmartRequestQueue {
    state: Arc<Mutex<RateLimitState>>,
    semaphore: Arc<Semaphore>,
    _max_concurrent: usize,
}

impl SmartRequestQueue {
    pub fn new(has_token: bool, max_concurrent: usize) -> Self {
        let state = if has_token {
            RateLimitState::new_authenticated()
        } else {
            RateLimitState::new_unauthenticated()
        };

        info!(
            "Initializing SmartRequestQueue: limit={}, max_concurrent={}",
            state.limit, max_concurrent
        );

        Self {
            state: Arc::new(Mutex::new(state)),
            semaphore: Arc::new(Semaphore::new(max_concurrent)),
            _max_concurrent: max_concurrent,
        }
    }

    /// Update rate limit state from GitHub API response headers
    pub async fn update_from_headers(
        &self,
        limit: Option<u32>,
        remaining: Option<u32>,
        reset: Option<u64>,
    ) {
        let mut state = self.state.lock().await;

        if let Some(limit) = limit {
            state.limit = limit;
        }
        if let Some(remaining) = remaining {
            state.remaining = remaining;
        }
        if let Some(reset) = reset {
            // reset is a Unix timestamp
            let now_unix = std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs();
            let duration_until_reset = reset.saturating_sub(now_unix);
            state.reset_at = Instant::now() + Duration::from_secs(duration_until_reset);
        }

        state.last_updated = Instant::now();

        debug!(
            "Rate limit updated: {}/{} remaining ({}%)",
            state.remaining,
            state.limit,
            state.remaining_percent()
        );

        if state.should_throttle() {
            warn!(
                "⚠️  Rate limit low: {}/{} ({}%) - throttling enabled",
                state.remaining,
                state.limit,
                state.remaining_percent()
            );
        }
    }

    /// Acquire permission to make a request
    /// Returns a permit that must be held while making the request
    pub async fn acquire(&self, metadata: RequestMetadata) -> RequestPermit {
        let state = self.state.lock().await;

        // Calculate priority-based delay
        let base_delay = state.recommended_delay();
        let priority_multiplier = match metadata.priority {
            RequestPriority::Critical => 0.0, // No additional delay
            RequestPriority::High => 0.5,     // 50% of base delay
            RequestPriority::Normal => 1.0,   // Full base delay
            RequestPriority::Low => 2.0,      // 2x base delay
        };

        let delay = base_delay.mul_f64(priority_multiplier);

        // For regex expansions, add batching delay
        let total_delay = if metadata.is_regex_expansion {
            // Batch regex queries with small delay to allow merging
            delay + Duration::from_millis(50)
        } else {
            delay
        };

        drop(state); // Release lock before sleeping

        if total_delay > Duration::from_millis(100) {
            debug!(
                "Throttling request (priority={:?}, delay={}ms): {}",
                metadata.priority,
                total_delay.as_millis(),
                metadata.query
            );
            tokio::time::sleep(total_delay).await;
        }

        // Acquire semaphore permit for concurrency control
        let permit = self
            .semaphore
            .clone()
            .acquire_owned()
            .await
            .expect("Semaphore closed");

        RequestPermit {
            _permit: permit,
            metadata,
        }
    }

    /// Decrement remaining count (called after successful request)
    pub async fn consume(&self) {
        let mut state = self.state.lock().await;
        state.remaining = state.remaining.saturating_sub(1);

        if state.remaining == 0 {
            warn!(
                "🚨 Rate limit exhausted! Reset in {}s",
                state.reset_at.duration_since(Instant::now()).as_secs()
            );
        }
    }

    /// Get current rate limit status
    pub async fn status(&self) -> RateLimitState {
        self.state.lock().await.clone()
    }

    /// Smart batching for regex expansion queries
    /// Groups multiple regex expansions to optimize API usage
    pub fn optimize_regex_expansions(
        &self,
        patterns: Vec<String>,
        max_per_batch: usize,
    ) -> Vec<Vec<String>> {
        let pattern_count = patterns.len();
        let mut batches = Vec::new();
        let mut current_batch = Vec::new();

        for pattern in patterns {
            current_batch.push(pattern);

            if current_batch.len() >= max_per_batch {
                batches.push(current_batch);
                current_batch = Vec::new();
            }
        }

        if !current_batch.is_empty() {
            batches.push(current_batch);
        }

        info!(
            "Optimized {} patterns into {} batches",
            pattern_count,
            batches.len()
        );

        batches
    }
}

/// RAII guard for request permits
pub struct RequestPermit {
    _permit: tokio::sync::OwnedSemaphorePermit,
    pub metadata: RequestMetadata,
}

impl RequestPermit {
    pub fn elapsed(&self) -> Duration {
        self.metadata.submitted_at.elapsed()
    }
}
