use std::path::PathBuf;
use std::time::Duration;
use tokio::fs::File;
use tokio::io::{AsyncBufReadExt, BufReader, AsyncSeekExt};

pub struct GhostLogMonitor {
    log_paths: Vec<PathBuf>,
}

impl GhostLogMonitor {
    pub fn new(log_paths: Vec<PathBuf>) -> Self {
        Self { log_paths }
    }

    pub async fn start(self) {
        tracing::info!("👻 Ghost Log Monitor active. Watching: {:?}", self.log_paths);
        
        for path in self.log_paths {
            let p = path.clone();
            tokio::spawn(async move {
                Self::watch_log(p).await;
            });
        }
    }

    async fn watch_log(path: PathBuf) {
        let mut interval = tokio::time::interval(Duration::from_secs(5));
        let mut last_size = 0;

        loop {
            interval.tick().await;

            if let Ok(metadata) = tokio::fs::metadata(&path).await {
                let current_size = metadata.len();
                if current_size > last_size {
                    if let Ok(file) = File::open(&path).await {
                         let mut reader = BufReader::new(file);
                         if let Ok(_) = reader.seek(std::io::SeekFrom::Start(last_size)).await {
                             let mut line = String::new();
                             while let Ok(n) = reader.read_line(&mut line).await {
                                 if n == 0 { break; }
                                 Self::analyze_line(&line, &path);
                                 line.clear();
                             }
                         }
                    }
                    last_size = current_size;
                }
            }
        }
    }

    fn analyze_line(line: &str, path: &PathBuf) {
        if line.contains("ECONNREFUSED") {
            tracing::warn!("👻 Ghost Log detected CONNECTION failure in {:?}. Triggering self-heal...", path);
            // In a real scenario, this would call into the Engine to reset connections or backoff
        } else if line.contains("rate limit") {
            tracing::warn!("👻 Ghost Log detected RATE LIMIT in {:?}. Adjusting throttle...", path);
        } else if line.contains("ERROR") || line.contains("Error") {
             // General error tracking
             // tracing::debug!("Ghost Log observed error: {}", line.trim());
        }
    }
}
