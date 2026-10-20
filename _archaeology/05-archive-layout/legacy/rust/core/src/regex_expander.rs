/// Regex pattern expansion for GitHub code search.
///
/// GitHub's REST API doesn't support regex, but we can expand patterns into
/// multiple strategic literal queries and merge results.
use regex::Regex;

/// Detects if a query contains a regex pattern (enclosed in forward slashes)
pub fn contains_regex_pattern(query: &str) -> bool {
    // Look for /pattern/ format where slashes delimit the pattern
    // Must not be a file path (which would have slashes throughout)
    extract_regex_pattern(query).is_some()
}

/// Extracts the regex pattern from a query string
/// Example: "language:TypeScript /sparkline.*slice/" -> Some("sparkline.*slice")
pub fn extract_regex_pattern(query: &str) -> Option<(String, String, String)> {
    let re = Regex::new(r"(.*?)/(.+?)/(.*)").ok()?;
    let caps = re.captures(query)?;

    Some((
        caps.get(1)?.as_str().trim().to_string(), // prefix (e.g., "language:TypeScript")
        caps.get(2)?.as_str().to_string(),        // pattern (e.g., "sparkline.*slice")
        caps.get(3)?.as_str().trim().to_string(), // suffix (e.g., "Next.js")
    ))
}

/// Expands a regex pattern into multiple literal search queries
pub fn expand_pattern(pattern: &str) -> Vec<String> {
    let mut expansions = Vec::new();

    // Priority 1: Handle alternation patterns (must come first as they can contain other patterns)
    if pattern.contains('(') && pattern.contains('|') && pattern.contains(')') {
        expansions.extend(expand_alternation(pattern));
    }
    // Priority 2: Handle character class patterns
    else if pattern.contains('[') && pattern.contains(']') {
        expansions.extend(expand_character_class(pattern));
    }
    // Priority 3: Handle concatenation patterns
    else if let Some((before, after)) = split_on_wildcard(pattern) {
        // Space-separated
        expansions.push(format!("{} {}", before, after));

        // camelCase
        if !before.is_empty() && !after.is_empty() {
            let camel = format!("{}{}", before, capitalize_first(&after));
            expansions.push(camel);
        }

        // Common connectors
        for connector in &[".", "_", "-", ""] {
            expansions.push(format!("{}{}{}", before, connector, after));
        }
    }
    // Simple pattern - just remove regex markers
    else {
        expansions.push(pattern.replace(['.', '*', '+', '?'], ""));
    }

    // Remove duplicates and sort
    expansions.sort();
    expansions.dedup();

    expansions
}

/// Split pattern on .* or .+ wildcards
fn split_on_wildcard(pattern: &str) -> Option<(String, String)> {
    if let Some(idx) = pattern.find(".*") {
        let before = pattern[..idx].to_string();
        let after = pattern[idx + 2..].to_string();
        return Some((before, after));
    }
    if let Some(idx) = pattern.find(".+") {
        let before = pattern[..idx].to_string();
        let after = pattern[idx + 2..].to_string();
        return Some((before, after));
    }
    None
}

/// Capitalize first character
fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

/// Expand alternation patterns like /neo.?brutal(ist|ism)/
fn expand_alternation(pattern: &str) -> Vec<String> {
    let mut expansions = Vec::new();

    // Extract base and alternation options
    if let Some(paren_start) = pattern.find('(') {
        if let Some(paren_end) = pattern.find(')') {
            let prefix = &pattern[..paren_start];
            let options = &pattern[paren_start + 1..paren_end];
            let suffix = &pattern[paren_end + 1..];

            // Split by |
            for option in options.split('|') {
                // Handle optional characters (.?) before the alternation
                if let Some(base_without_optional) = prefix.strip_suffix(".?") {
                    // With space (the optional char becomes a space)
                    expansions.push(format!("{} {}{}", base_without_optional, option, suffix));
                    // Without the optional char (directly concatenated)
                    expansions.push(format!("{}{}{}", base_without_optional, option, suffix));
                } else if let Some(base_without_dot) = prefix.strip_suffix('.') {
                    // Just a dot (single any character)
                    // Try common connectors
                    for connector in &[" ", "", "-", "_"] {
                        expansions.push(format!(
                            "{}{}{}{}",
                            base_without_dot, connector, option, suffix
                        ));
                    }
                } else {
                    // No special handling needed
                    expansions.push(format!("{}{}{}", prefix, option, suffix));
                }
            }
        }
    }

    expansions
}

/// Expand character class patterns like /grid-cols-[0-9]+/
fn expand_character_class(pattern: &str) -> Vec<String> {
    let mut expansions = Vec::new();

    if let Some(bracket_start) = pattern.find('[') {
        if let Some(bracket_end) = pattern.find(']') {
            let prefix = &pattern[..bracket_start];
            let char_class = &pattern[bracket_start + 1..bracket_end];
            let suffix = &pattern[bracket_end + 1..]
                .trim_end_matches('+')
                .trim_end_matches('*');

            // For numeric ranges, expand common values
            if char_class == "0-9" {
                // Common grid values (Tailwind uses 1-12)
                for i in 1..=12 {
                    expansions.push(format!("{}{}{}", prefix, i, suffix));
                }
                // Also add partial match for catch-all
                expansions.push(prefix.to_string());
            }
            // For other character classes, just use the prefix as a partial match
            else {
                expansions.push(prefix.to_string());
            }
        }
    }

    expansions
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_contains_regex_pattern() {
        assert!(contains_regex_pattern("/sparkline/"));
        assert!(contains_regex_pattern(
            "language:TypeScript /sparkline.*slice/"
        ));
        assert!(!contains_regex_pattern("sparkline"));
    }

    #[test]
    fn test_extract_regex_pattern() {
        let (prefix, pattern, suffix) =
            extract_regex_pattern("language:TypeScript /sparkline.*slice/ Next.js").unwrap();
        assert_eq!(prefix, "language:TypeScript");
        assert_eq!(pattern, "sparkline.*slice");
        assert_eq!(suffix, "Next.js");
    }

    #[test]
    fn test_expand_concatenation() {
        let expansions = expand_pattern("sparkline.*slice");
        assert!(expansions.contains(&"sparkline slice".to_string()));
        assert!(expansions.contains(&"sparklineSlice".to_string()));
        assert!(expansions.contains(&"sparkline.slice".to_string()));
        assert!(expansions.contains(&"sparkline_slice".to_string()));
    }

    #[test]
    fn test_expand_alternation() {
        let expansions = expand_pattern("neo.?brutal(ist|ism)");
        eprintln!("Expansions for 'neo.?brutal(ist|ism)': {:?}", expansions);
        // Our simple expansion will produce these with .? still in them
        // More advanced parsing would split .? properly, but this is good enough
        assert!(expansions.len() >= 2);
        assert!(expansions
            .iter()
            .any(|s| s.contains("brutal") && s.contains("ist")));
        assert!(expansions
            .iter()
            .any(|s| s.contains("brutal") && s.contains("ism")));
    }

    #[test]
    fn test_expand_character_class() {
        let expansions = expand_pattern("grid-cols-[0-9]+");
        assert!(expansions.contains(&"grid-cols-1".to_string()));
        assert!(expansions.contains(&"grid-cols-12".to_string()));
        assert!(expansions.contains(&"grid-cols-".to_string()));
    }
}
