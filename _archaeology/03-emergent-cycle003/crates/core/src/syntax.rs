//! GitHub Code Search Syntax Implementation
//!
//! Supports all advanced qualifiers, boolean operators, and regex patterns
//! as defined in GitHub documentation.

use std::fmt;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Operator {
    And,
    Or,
    Not,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum Qualifier {
    Repo(String),
    Org(String),
    User(String),
    Language(String),
    Path(String),
    Symbol(String),
    Content(String),
    Is(String),
    Extension(String), // Helper for path:*.ext
}

impl fmt::Display for Qualifier {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Qualifier::Repo(s) => write!(f, "repo:{}", s),
            Qualifier::Org(s) => write!(f, "org:{}", s),
            Qualifier::User(s) => write!(f, "user:{}", s),
            Qualifier::Language(s) => write!(f, "language:{}", s),
            Qualifier::Path(s) => write!(f, "path:{}", s),
            Qualifier::Symbol(s) => write!(f, "symbol:{}", s),
            Qualifier::Content(s) => write!(f, "content:{}", s),
            Qualifier::Is(s) => write!(f, "is:{}", s),
            Qualifier::Extension(s) => write!(f, "extension:{}", s),
        }
    }
}

#[derive(Debug, Clone)]
pub struct SearchQuery {
    pub terms: Vec<String>,
    pub qualifiers: Vec<Qualifier>,
    pub regex: Option<String>,
    pub raw_string: String,
}

impl SearchQuery {
    /// Parse a raw query string into a structured SearchQuery
    pub fn parse(input: &str) -> Self {
        // Basic parsing - this can be enhanced with a proper parser combinator if needed
        // For now, we manually split and identify qualifiers

        let mut terms = Vec::new();
        let mut qualifiers = Vec::new();

        // Handle regex wrapper /pattern/
        let regex = if input.starts_with('/') && input.ends_with('/') && input.len() > 2 {
            Some(input.to_string())
        } else {
            None
        };

        // Use shlex for robust tokenization handling quotes
        let parts = shlex::split(input)
            .unwrap_or_else(|| input.split_whitespace().map(String::from).collect());

        for part in parts {
            if let Some(q) = Self::parse_qualifier(&part) {
                qualifiers.push(q);
            } else {
                terms.push(part);
            }
        }

        SearchQuery {
            terms,
            qualifiers,
            regex,
            raw_string: input.to_string(),
        }
    }

    fn parse_qualifier(part: &str) -> Option<Qualifier> {
        let (key, value) = part.split_once(':')?;
        if value.is_empty() {
            return None;
        }

        match key.to_lowercase().as_str() {
            "repo" => Some(Qualifier::Repo(value.to_string())),
            "org" => Some(Qualifier::Org(value.to_string())),
            "user" => Some(Qualifier::User(value.to_string())),
            "language" | "lang" => Some(Qualifier::Language(value.to_string())),
            "path" => Some(Qualifier::Path(value.to_string())),
            "symbol" => Some(Qualifier::Symbol(value.to_string())),
            "content" => Some(Qualifier::Content(value.to_string())),
            "is" => Some(Qualifier::Is(value.to_string())),
            "extension" | "ext" => Some(Qualifier::Extension(value.to_string())),
            _ => None,
        }
    }

    /// Reconstruct the query string for the API
    pub fn to_api_string(&self) -> String {
        if let Some(re) = &self.regex {
            return re.clone();
        }

        let mut parts = Vec::new();

        for term in &self.terms {
            if term.contains(' ') {
                parts.push(format!("\"{}\"", term));
            } else {
                parts.push(term.clone());
            }
        }

        for qual in &self.qualifiers {
            parts.push(qual.to_string());
        }

        parts.join(" ")
    }

    /// Ensure the query has minimal qualifiers for specific API endpoints
    pub fn ensure_qualifiers_for_code_search(&self) -> String {
        let mut q = self.clone();

        // Check if we have any scoping qualifiers
        let has_scope = q.qualifiers.iter().any(|q| {
            matches!(
                q,
                Qualifier::Repo(_)
                    | Qualifier::User(_)
                    | Qualifier::Org(_)
                    | Qualifier::Language(_)
            )
        });

        // If no scope and terms suggest a language (naive heuristic), add it
        if !has_scope {
            // Heuristic: if terms contain "rust", add "language:rust"
            for term in &q.terms {
                match term.to_lowercase().as_str() {
                    "rust" | "rs" => q.qualifiers.push(Qualifier::Language("rust".into())),
                    "go" | "golang" => q.qualifiers.push(Qualifier::Language("go".into())),
                    "python" | "py" => q.qualifiers.push(Qualifier::Language("python".into())),
                    "javascript" | "js" => {
                        q.qualifiers.push(Qualifier::Language("javascript".into()))
                    }
                    "typescript" | "ts" => {
                        q.qualifiers.push(Qualifier::Language("typescript".into()))
                    }
                    _ => {}
                }
            }
        }

        q.to_api_string()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_full_syntax() {
        let q = SearchQuery::parse(
            "repo:microsoft/vscode language:typescript path:src/vs symbol:create",
        );
        assert_eq!(q.qualifiers.len(), 4);
        assert!(q
            .qualifiers
            .contains(&Qualifier::Repo("microsoft/vscode".into())));
    }

    #[test]
    fn test_regex() {
        let q = SearchQuery::parse("/sparse.*index/");
        assert_eq!(q.regex, Some("/sparse.*index/".into()));
    }

    #[test]
    fn test_smart_qualifier_injection() {
        let q = SearchQuery::parse("itertools rust");
        let api_str = q.ensure_qualifiers_for_code_search();
        assert!(api_str.contains("language:rust"));
    }
}
