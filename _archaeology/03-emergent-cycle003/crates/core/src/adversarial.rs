// Cycle 8: Adversarial Query Generator
// Beyond-baseline: Generate challenging queries to test system robustness

use rand::Rng;

pub struct AdversarialGenerator {
    edge_cases: Vec<String>,
}

impl AdversarialGenerator {
    pub fn new() -> Self {
        Self {
            edge_cases: vec![
                // Empty/minimal queries
                "".to_string(),
                " ".to_string(),
                "a".to_string(),
                
                // Special characters
                "!@#$%^&*()".to_string(),
                "/../../../etc/passwd".to_string(),
                "<script>alert('xss')</script>".to_string(),
                
                // Regex edge cases
                "/^$/".to_string(),
                "/.*/.*/".to_string(),
                "/(?:(?:(?:".to_string(),
                
                // Very long queries
                "a".repeat(10000),
                
                // Unicode edge cases
                "🔥💻🚀".to_string(),
                "日本語検索".to_string(),
                "مرحبا".to_string(),
                
                // SQL injection attempts
                "'; DROP TABLE results; --".to_string(),
                "1' OR '1'='1".to_string(),
            ],
        }
    }

    // Generate adversarial query
    pub fn generate(&self) -> String {
        let mut rng = rand::thread_rng();
        let idx = rng.gen_range(0..self.edge_cases.len());
        self.edge_cases[idx].clone()
    }

    // Fuzz a normal query to create edge cases
    pub fn fuzz(&self, query: &str) -> Vec<String> {
        let mut fuzzy = Vec::new();
        
        // Duplicate characters
        fuzzy.push(query.chars().flat_map(|c| vec![c, c]).collect());
        
        // Insert random characters
        let mut with_random = query.to_string();
        if !with_random.is_empty() {
            let mut rng = rand::thread_rng();
            let pos = rng.gen_range(0..with_random.len());
            with_random.insert(pos, '🔥');
            fuzzy.push(with_random);
        }
        
        // Case mutations
        fuzzy.push(query.to_uppercase());
        fuzzy.push(query.to_lowercase());
        fuzzy.push(query.chars().enumerate().map(|(i, c)| {
            if i % 2 == 0 { c.to_uppercase().to_string() } else { c.to_lowercase().to_string() }
        }).collect());
        
        // Truncation
        if query.len() > 5 {
            fuzzy.push(query[..query.len()/2].to_string());
        }
        
        // Repetition
        fuzzy.push(format!("{} {} {}", query, query, query));
        
        fuzzy
    }

    // Test if query causes issues
    pub fn is_problematic(&self, query: &str) -> bool {
        query.is_empty() 
            || query.len() > 5000
            || query.contains("<script")
            || query.contains("DROP TABLE")
            || query.contains("../")
    }
}
