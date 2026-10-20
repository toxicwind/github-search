use regex::Regex;
use crate::SearchResult;

#[derive(Debug, Clone)]
pub enum RegexStrategy {
    Strict(Regex),
    Fuzzy { pattern: String, threshold: f32 },
    Structural(Vec<String>),
}

#[derive(Debug, Clone, PartialEq)]
pub enum Evaluation {
    Verified,
    FuzzyMatch(f32),
    StructuralMatch,
    Unmatched,
    None,
}

impl std::fmt::Display for Evaluation {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Evaluation::Verified => write!(f, "REGEX_VERIFIED"),
            Evaluation::FuzzyMatch(score) => write!(f, "FUZZY_MATCH({})", (score * 100.0) as u32),
            Evaluation::StructuralMatch => write!(f, "STRUCTURAL_MATCH"),
            Evaluation::Unmatched => write!(f, "REGEX_UNMATCHED"),
            Evaluation::None => write!(f, "LATENT_MATCH"),
        }
    }
}

pub struct TripleHybridEngine {
    strategies: Vec<RegexStrategy>,
}

impl TripleHybridEngine {
    pub fn new(query: &str) -> Self {
        let mut strategies = Vec::new();

        // 1. Strict Strategy
        if let Some((_, pattern, _)) = crate::regex_expander::extract_regex_pattern(query) {
             if let Ok(re) = regex::RegexBuilder::new(&pattern)
                .case_insensitive(true)
                .build() 
             {
                 strategies.push(RegexStrategy::Strict(re));
                 
                 // 2. Fuzzy Strategy (Fallback from strict pattern)
                 strategies.push(RegexStrategy::Fuzzy { 
                     pattern: pattern.clone(), 
                     threshold: 0.7 
                 });
             }
        }

        // 3. Structural Strategy (Heuristic based on query terms)
        if query.contains("mcp") || query.contains("server") {
             strategies.push(RegexStrategy::Structural(vec![
                 "Cargo.toml".to_string(),
                 "main.rs".to_string(), 
                 "package.json".to_string()
             ]));
        }

        Self { strategies }
    }

    pub fn evaluate(&self, result: &SearchResult) -> (Evaluation, f64) {
        if self.strategies.is_empty() {
            return (Evaluation::None, 0.0);
        }

        let full_text = format!(
            "{}\n{}\n{}", 
            result.title, 
            result.snippet.as_deref().unwrap_or(""),
            result.path.as_deref().unwrap_or("")
        );

        let mut best_eval = Evaluation::Unmatched;
        let mut best_score = 0.0;

        for strategy in &self.strategies {
            match strategy {
                RegexStrategy::Strict(re) => {
                    if re.is_match(&full_text) {
                        return (Evaluation::Verified, 100.0); // Strict match halts immediately with max score
                    }
                },
                RegexStrategy::Fuzzy { pattern, threshold } => {
                     // Simple token overlap approximation for fuzzy
                     let pattern_tokens: Vec<&str> = pattern.split_whitespace().collect();
                     let match_count = pattern_tokens.iter()
                        .filter(|t| full_text.contains(*t))
                        .count();
                     
                     let score = if !pattern_tokens.is_empty() {
                         match_count as f32 / pattern_tokens.len() as f32
                     } else { 0.0 };

                     if score >= *threshold && score > best_score as f32 {
                         best_score = score as f64 * 80.0; // Max 80 for fuzzy
                         best_eval = Evaluation::FuzzyMatch(score);
                     }
                },
                RegexStrategy::Structural(files) => {
                    // This would ideally check file tree, but for search results we utilize path/snippet cues
                     let hits = files.iter().filter(|f| full_text.contains(*f)).count();
                     if hits > 0 {
                         let score = 50.0 + (hits * 10) as f64;
                         if score > best_score {
                             best_score = score;
                             best_eval = Evaluation::StructuralMatch;
                         }
                     }
                }
            }
        }

        (best_eval, best_score)
    }
}
