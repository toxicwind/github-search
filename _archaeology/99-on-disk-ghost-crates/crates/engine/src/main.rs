//! ghas-engine — ML ranking sidecar. Bun MCP spawns this, pipes JSON lines.
mod ranker;
mod types;

use std::io::{self, BufRead, Write};
use types::{EngineRequest, EngineResponse};

fn main() {
    eprintln!("[ghas-engine] ready");

    let stdin = io::stdin();
    let mut stdout = io::stdout();

    for line in stdin.lock().lines() {
        let Ok(line) = line else { continue };
        let line = line.trim().to_string();
        if line.is_empty() {
            continue;
        }

        let req: EngineRequest = match serde_json::from_str(&line) {
            Ok(r) => r,
            Err(e) => {
                let resp = EngineResponse {
                    ok: false,
                    method: "parse_error".into(),
                    results: vec![],
                    error: Some(e.to_string()),
                };
                let _ = writeln!(
                    stdout,
                    "{}",
                    serde_json::to_string(&resp).unwrap_or_default()
                );
                let _ = stdout.flush();
                continue;
            }
        };

        let resp = match req.method.as_str() {
            "rank" => EngineResponse {
                ok: true,
                method: "rank".into(),
                results: ranker::MlRanker::rank(&req.query, req.items),
                error: None,
            },
            "health" => EngineResponse {
                ok: true,
                method: "health".into(),
                results: vec![],
                error: None,
            },
            other => EngineResponse {
                ok: false,
                method: other.into(),
                results: vec![],
                error: Some(format!("unknown method: {}", other)),
            },
        };

        let _ = writeln!(
            stdout,
            "{}",
            serde_json::to_string(&resp).unwrap_or_default()
        );
        let _ = stdout.flush();
    }
}
