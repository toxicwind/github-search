use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::HashSet;
use tracing::debug;

pub struct ContextAnalyzer;

#[derive(Debug, Default, Serialize, Deserialize, Clone)]
pub struct LocalContext {
    pub keywords: HashSet<String>,
    pub project_name: Option<String>,
    pub description: Option<String>,
}

impl LocalContext {
    pub fn load() -> Self {
        let mut context = Self::default();

        // 1. Try .agent/context
        if let Ok(content) = std::fs::read_to_string(".agent/context") {
            context.extract_from_text(&content);
        }

        // 2. Try README.md
        if let Ok(content) = std::fs::read_to_string("README.md") {
            context.parse_document(&content);
        }

        context
    }

    pub fn parse_document(&mut self, content: &str) {
        // Extract keywords
        self.extract_from_text(content);

        // Try to extract project name if not set
        if self.project_name.is_none() {
            for line in content.lines() {
                let trimmed = line.trim();
                if trimmed.starts_with("# ") {
                    self.project_name = Some(trimmed.trim_start_matches("# ").trim().to_string());
                    break;
                }
            }
        }
    }

    fn extract_from_text(&mut self, text: &str) {
        // Naive keyword extraction: words longer than 4 chars that are not common English words
        let common_words: HashSet<&str> = [
            "this",
            "that",
            "with",
            "from",
            "your",
            "development",
            "github",
            "search",
        ]
        .iter()
        .cloned()
        .collect();
        let words: Vec<&str> = text.split_whitespace().collect();
        for word in words {
            let clean = word
                .trim_matches(|c: char| !c.is_alphanumeric())
                .to_lowercase();
            if clean.len() > 4 && !common_words.contains(clean.as_str()) {
                self.keywords.insert(clean);
            }
        }
    }
}

impl ContextAnalyzer {
    pub fn find_connected_files(code: &str, path: &str, language: Option<&str>) -> Vec<String> {
        let mut connected = HashSet::new();
        let mut lang = language.unwrap_or("unknown").to_lowercase();

        if lang == "unknown" {
            if path.ends_with(".rs") {
                lang = "rust".to_string();
            } else if path.ends_with(".py") {
                lang = "python".to_string();
            } else if path.ends_with(".js") {
                lang = "javascript".to_string();
            } else if path.ends_with(".ts") {
                lang = "typescript".to_string();
            }
        }

        if lang == "rust" || lang == "rs" {
            // Rust: mod foo; use crate::foo;
            let mod_regex = Regex::new(r"mod\s+([a-zA-Z0-9_]+);").unwrap();
            for cap in mod_regex.captures_iter(code) {
                if let Some(m) = cap.get(1) {
                    connected.insert(format!("{}.rs", m.as_str()));
                    connected.insert(format!("{}/mod.rs", m.as_str()));
                }
            }

            let use_crate_regex = Regex::new(r"use\s+crate::([a-zA-Z0-9_]+)").unwrap();
            for cap in use_crate_regex.captures_iter(code) {
                if let Some(m) = cap.get(1) {
                    connected.insert(format!("{}.rs", m.as_str()));
                }
            }
        } else if lang == "python" || lang == "py" {
            // Python: from . import foo
            let from_dot_import = Regex::new(r"from\s+\.\s+import\s+([a-zA-Z0-9_]+)").unwrap();
            for cap in from_dot_import.captures_iter(code) {
                if let Some(m) = cap.get(1) {
                    connected.insert(format!("{}.py", m.as_str()));
                }
            }
        } else if lang == "javascript" || lang == "typescript" || lang == "js" || lang == "ts" {
            // JS: import ... from './foo'
            let import_regex = Regex::new(r#"from\s+['"]\./([a-zA-Z0-9_\-\.]+)['"]"#).unwrap();
            for cap in import_regex.captures_iter(code) {
                if let Some(m) = cap.get(1) {
                    let valid_exts = vec!["js", "ts", "jsx", "tsx"];
                    for ext in valid_exts {
                        connected.insert(format!("{}.{}", m.as_str(), ext));
                    }
                }
            }
        }

        let result: Vec<String> = connected.into_iter().collect();
        debug!(
            "Found connected files heuristic for language {}: {:?}",
            lang, result
        );
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_local_context() {
        let mut context = LocalContext::default();
        context.parse_document("# My Awesome Project\n\nThis is a search tool for GitHub.");

        assert_eq!(context.project_name, Some("My Awesome Project".to_string()));
        // "awesome" is > 4 chars
        // "project" is > 4 chars
        assert!(context.keywords.contains("awesome"));
        assert!(context.keywords.contains("project"));
    }

    #[test]
    fn test_find_connected_rust() {
        let code = r#"
            mod utils;
            use crate::models::User;
        "#;
        let connected = ContextAnalyzer::find_connected_files(code, "src/main.rs", Some("rust"));
        assert!(connected.contains(&"utils.rs".to_string()));
        assert!(connected.contains(&"utils/mod.rs".to_string()));
        assert!(connected.contains(&"models.rs".to_string()));
    }
}
