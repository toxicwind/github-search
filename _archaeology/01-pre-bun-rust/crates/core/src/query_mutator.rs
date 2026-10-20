// Cycle 4: Query Mutation Engine
// Beyond-baseline: Automatically generate query variations for better coverage

use rand::Rng;

pub struct QueryMutator {
    synonyms: std::collections::HashMap<String, Vec<String>>,
}

impl Default for QueryMutator {
    fn default() -> Self {
        Self::new()
    }
}

impl QueryMutator {
    pub fn new() -> Self {
        let mut synonyms = std::collections::HashMap::new();

        // Programming language synonyms
        synonyms.insert(
            "rust".to_string(),
            vec!["rustlang".to_string(), "rs".to_string()],
        );
        synonyms.insert(
            "javascript".to_string(),
            vec!["js".to_string(), "ecmascript".to_string()],
        );
        synonyms.insert("typescript".to_string(), vec!["ts".to_string()]);

        // Concept synonyms
        synonyms.insert(
            "async".to_string(),
            vec!["asynchronous".to_string(), "concurrent".to_string()],
        );
        synonyms.insert(
            "parallel".to_string(),
            vec!["concurrent".to_string(), "multi-threaded".to_string()],
        );
        synonyms.insert(
            "cache".to_string(),
            vec!["memoize".to_string(), "buffer".to_string()],
        );

        Self { synonyms }
    }

    // Generate mutations of a query
    pub fn mutate(&self, query: &str, max_mutations: usize) -> Vec<String> {
        let mut mutations = Vec::new();

        // Mutation 0: Strip quotes (HIGH PRIORITY Relaxation)
        if query.contains('"') {
            mutations.push(query.replace('"', ""));
        }

        let re = regex::Regex::new(r#"[^\s"]+|"([^"]*)""#).unwrap();
        let words: Vec<String> = re
            .find_iter(query)
            .map(|m| m.as_str().to_string())
            .collect();

        // Mutation 1: Synonym replacement
        for (i, word) in words.iter().enumerate() {
            if let Some(syns) = self.synonyms.get(&word.to_lowercase()) {
                for syn in syns {
                    let mut mutated = words.clone();
                    mutated[i] = syn.clone();
                    mutations.push(mutated.join(" "));
                }
            }
        }

        // Mutation 2: Word reordering (for non-regex queries)
        if !query.contains('/') && words.len() > 1 {
            let mut reordered = words.clone();
            reordered.reverse();
            mutations.push(reordered.join(" "));
        }

        // Mutation 3: Add common qualifiers (only if not already present)
        if !query.contains("language:") {
            mutations.push(format!("{} language:rust", query));
        }
        if !query.contains("in:") {
            mutations.push(format!("{} in:file", query));
        }
        if !query.contains("path:") {
            mutations.push(format!("{} path:src", query));
        }

        mutations.truncate(max_mutations);
        mutations
    }

    // Genetic algorithm: combine two queries
    pub fn crossover(&self, query_a: &str, query_b: &str) -> String {
        let words_a: Vec<&str> = query_a.split_whitespace().collect();
        let words_b: Vec<&str> = query_b.split_whitespace().collect();

        let mut rng = rand::thread_rng();
        let split_point = rng.gen_range(0..words_a.len().min(words_b.len()));

        let mut result = words_a[..split_point].to_vec();
        result.extend_from_slice(&words_b[split_point..]);

        result.join(" ")
    }
}
