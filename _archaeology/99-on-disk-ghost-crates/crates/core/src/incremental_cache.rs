// Cycle 3: Incremental Cache with Smart Invalidation
// Beyond-baseline: Cache results with dependency-aware invalidation

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::time::{Duration, SystemTime};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CacheEntry<T> {
    pub value: T,
    pub timestamp: SystemTime,
    pub dependencies: Vec<String>,
    pub access_count: u64,
}

#[derive(Serialize, Deserialize)]
pub struct IncrementalCache<T> {
    entries: HashMap<String, CacheEntry<T>>,
    ttl: Duration,
    max_size: usize,
}

impl<T: Clone + Serialize + for<'de> Deserialize<'de>> IncrementalCache<T> {
    pub fn new(ttl: Duration, max_size: usize) -> Self {
        Self {
            entries: HashMap::new(),
            ttl,
            max_size,
        }
    }

    pub fn load<P: AsRef<std::path::Path>>(path: P) -> Result<Self, Box<dyn std::error::Error>> {
        let file = std::fs::File::open(path)?;
        let reader = std::io::BufReader::new(file);
        let cache = serde_json::from_reader(reader)?;
        Ok(cache)
    }

    pub fn save<P: AsRef<std::path::Path>>(
        &self,
        path: P,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let file = std::fs::File::create(path)?;
        let writer = std::io::BufWriter::new(file);
        serde_json::to_writer(writer, self)?;
        Ok(())
    }

    pub fn get(&mut self, key: &str) -> Option<T> {
        if let Some(entry) = self.entries.get_mut(key) {
            if entry.timestamp.elapsed().ok()? < self.ttl {
                entry.access_count += 1;
                return Some(entry.value.clone());
            } else {
                // Expired
                self.entries.remove(key);
            }
        }
        None
    }

    pub fn insert(&mut self, key: String, value: T, dependencies: Vec<String>) {
        // Evict if at capacity (LRU-style)
        if self.entries.len() >= self.max_size {
            if let Some(lru_key) = self.find_lru() {
                self.entries.remove(&lru_key);
            }
        }

        self.entries.insert(
            key,
            CacheEntry {
                value,
                timestamp: SystemTime::now(),
                dependencies,
                access_count: 0,
            },
        );
    }

    // Invalidate entries that depend on a changed key
    pub fn invalidate_dependents(&mut self, changed_key: &str) {
        let to_remove: Vec<String> = self
            .entries
            .iter()
            .filter(|(_, entry)| entry.dependencies.contains(&changed_key.to_string()))
            .map(|(k, _)| k.clone())
            .collect();

        for key in to_remove {
            self.entries.remove(&key);
        }
    }

    fn find_lru(&self) -> Option<String> {
        self.entries
            .iter()
            .min_by_key(|(_, entry)| entry.access_count)
            .map(|(k, _)| k.clone())
    }

    pub fn stats(&self) -> CacheStats {
        CacheStats {
            total_entries: self.entries.len(),
            capacity: self.max_size,
            hit_rate: 0.0, // Would need to track hits/misses
        }
    }
}

#[derive(Debug)]
pub struct CacheStats {
    pub total_entries: usize,
    pub capacity: usize,
    pub hit_rate: f64,
}
