use anyhow::{Context, Result};
use chrono::{DateTime, Duration, Utc};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::time::SystemTime;
use tracing::{debug, info, warn};

const CACHE_DIR: &str = ".gh-search-cache";

#[derive(Serialize, Deserialize)]
struct CacheEntry<T> {
    timestamp: DateTime<Utc>,
    data: T,
}

#[derive(Clone)]
pub struct DiskCache {
    path: PathBuf,
    default_ttl: Duration,
    max_bytes: u64,
    max_entry_bytes: u64,
}

impl DiskCache {
    pub fn new(ttl_days: i64) -> Result<Self> {
        let path = if let Ok(custom_path) = std::env::var("GH_SEARCH_CACHE_DIR") {
            PathBuf::from(custom_path)
        } else {
            let home = dirs::home_dir().context("Could not find home directory")?;
            home.join(CACHE_DIR)
        };

        std::fs::create_dir_all(&path)?;

        let max_bytes = std::env::var("GH_SEARCH_CACHE_MAX_MB")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .map(|mb| mb * 1024 * 1024)
            .unwrap_or(512 * 1024 * 1024); // default 512 MB cap

        let max_entry_bytes = std::env::var("GH_SEARCH_CACHE_MAX_ENTRY_KB")
            .ok()
            .and_then(|v| v.parse::<u64>().ok())
            .map(|kb| kb * 1024)
            .unwrap_or(512 * 1024); // default 512 KB per entry

        Ok(Self {
            path,
            default_ttl: Duration::days(ttl_days),
            max_bytes,
            max_entry_bytes,
        })
    }

    pub fn new_with_limits(
        ttl_days: i64,
        max_mb: u64,
        max_entry_kb: u64,
        path: PathBuf,
    ) -> Result<Self> {
        std::fs::create_dir_all(&path)?;
        Ok(Self {
            path,
            default_ttl: Duration::days(ttl_days),
            max_bytes: max_mb * 1024 * 1024,
            max_entry_bytes: max_entry_kb * 1024,
        })
    }

    pub async fn get<T: for<'a> Deserialize<'a>>(&self, key: &str) -> Result<Option<T>> {
        match cacache::read(&self.path, key).await {
            Ok(bytes) => {
                let entry: CacheEntry<T> = serde_json::from_slice(&bytes)?;
                let age = Utc::now() - entry.timestamp;
                if age > self.default_ttl {
                    debug!("Cache expired for key: {}", key);
                    cacache::remove(&self.path, key).await?;
                    Ok(None)
                } else {
                    debug!("Cache hit: {}", key);
                    Ok(Some(entry.data))
                }
            }
            Err(cacache::Error::EntryNotFound(_, _)) => Ok(None),
            Err(e) => Err(anyhow::anyhow!(e)),
        }
    }

    pub async fn put<T: Serialize>(&self, key: &str, data: T) -> Result<()> {
        let entry = CacheEntry {
            timestamp: Utc::now(),
            data,
        };
        let bytes = serde_json::to_vec(&entry)?;

        if bytes.len() as u64 > self.max_entry_bytes {
            warn!(
                "Cache entry for {} skipped ({} bytes exceeds {} byte cap). \
                 Tune via GH_SEARCH_CACHE_MAX_ENTRY_KB.",
                key,
                bytes.len(),
                self.max_entry_bytes
            );
            return Ok(());
        }

        cacache::write(&self.path, key, &bytes).await?;
        debug!("Cache stored: {}", key);
        self.enforce_size_limit().await?;
        Ok(())
    }

    // Aggressive cleanup for old files not just by key access
    pub async fn clean(&self) -> Result<()> {
        info!("Starting cache cleanup...");
        // cacache doesn't expose a simple "remove older than X" easily without metadata iteration
        // For now, simpler approach: rely on TTL check on access, and manual rimraf if needed.
        // Or specific metadata walker if available.
        // NOTE: In a production 'complex' app we would walk the metadata index.
        // For this MVP step 1, we rely on read-time expiry.
        Ok(())
    }

    async fn enforce_size_limit(&self) -> Result<()> {
        let mut total: u64 = 0;
        let mut files: Vec<(PathBuf, u64, SystemTime)> = Vec::new();
        let mut stack = vec![self.path.clone()];

        while let Some(dir) = stack.pop() {
            let mut rd = tokio::fs::read_dir(&dir).await?;
            while let Some(entry) = rd.next_entry().await? {
                let meta = entry.metadata().await?;
                if meta.is_dir() {
                    stack.push(entry.path());
                } else if meta.is_file() {
                    let size = meta.len();
                    let modified = meta.modified().unwrap_or(SystemTime::UNIX_EPOCH);
                    total = total.saturating_add(size);
                    files.push((entry.path(), size, modified));
                }
            }
        }

        if total <= self.max_bytes {
            return Ok(());
        }

        // Simplest safe strategy with cacache: clear the store when over budget.
        // (Directly removing content files without index updates corrupts the cache.)
        warn!(
            "Cache size {} bytes exceeded cap {} bytes — clearing store at {:?}",
            total, self.max_bytes, self.path
        );
        cacache::clear(&self.path).await?;

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[tokio::test]
    async fn skips_entry_over_size_cap() -> Result<()> {
        let tmp = TempDir::new()?;
        let cache = DiskCache::new_with_limits(1, 10, 1, tmp.path().into())?;

        let big_data = vec![0_u8; 2048]; // 2KB
        cache.put("big", &big_data).await?;
        let loaded: Option<Vec<u8>> = cache.get("big").await?;
        assert!(loaded.is_none());
        Ok(())
    }

    #[tokio::test]
    async fn evicts_when_over_total_cap() -> Result<()> {
        let tmp = TempDir::new()?;
        let cache = DiskCache::new_with_limits(1, 1, 256, tmp.path().into())?;

        // Each entry ~100KB
        let payload = vec![1_u8; 100 * 1024];
        for i in 0..20 {
            let key = format!("k{}", i);
            cache.put(&key, &payload).await?;
        }

        // After enforcing, cache should be at or under the cap; clears may remove everything.
        let mut remaining = 0;
        for i in 0..20 {
            let key = format!("k{}", i);
            if cache.get::<Vec<u8>>(&key).await?.is_some() {
                remaining += 1;
            }
        }
        assert!(
            remaining < 20,
            "at least some entries should have been evicted when over budget"
        );

        use std::path::Path;

        fn dir_size(path: &Path) -> u64 {
            let mut total: u64 = 0;
            let mut stack = vec![path.to_path_buf()];
            while let Some(dir) = stack.pop() {
                if let Ok(rd) = std::fs::read_dir(&dir) {
                    for entry in rd.flatten() {
                        if let Ok(meta) = entry.metadata() {
                            if meta.is_dir() {
                                stack.push(entry.path());
                            } else {
                                total = total.saturating_add(meta.len());
                            }
                        }
                    }
                }
            }
            total
        }

        assert!(
            dir_size(tmp.path()) <= 1_200_000,
            "cache directory should respect size cap"
        );
        Ok(())
    }
}
