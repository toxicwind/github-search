// Advanced Code Graph Analyzer using tree-sitter
// Cycle 2 Enhancement: Replace naive string matching with AST-based dependency detection

use std::collections::{HashMap, HashSet};
use std::time::Instant;
use tree_sitter::Parser;

pub struct CodeGraphAnalyzer {
    parser: Parser,
}

#[derive(Debug, Clone)]
pub struct DependencyEdge {
    pub from: String,
    pub to: String,
    pub edge_type: EdgeType,
    pub line: usize,
}

#[derive(Debug, Clone, PartialEq)]
pub enum EdgeType {
    Import,
    FunctionCall,
    TypeReference,
    TraitImplementation,
    StructDefinition,
    EnumDefinition,
}

impl CodeGraphAnalyzer {
    pub fn new() -> Result<Self, Box<dyn std::error::Error>> {
        let mut parser = Parser::new();
        parser.set_language(&tree_sitter_rust::LANGUAGE.into())?;
        Ok(Self { parser })
    }

    /// Extract dependencies from Rust code using tree-sitter AST
    pub fn analyze_rust_code(&mut self, code: &str, file_name: &str) -> Vec<DependencyEdge> {
        let start = Instant::now();
        let mut edges = Vec::new();

        let tree = match self.parser.parse(code, None) {
            Some(t) => t,
            None => return edges,
        };

        let root = tree.root_node();
        let mut cursor = root.walk();

        // Traverse the AST using cursor
        Self::traverse_node(&mut cursor, code, file_name, &mut edges);

        let elapsed = start.elapsed();
        eprintln!("analyze_rust_code for {} took {:?}", file_name, elapsed);
        edges
    }

    fn traverse_node(
        cursor: &mut tree_sitter::TreeCursor,
        code: &str,
        file_name: &str,
        edges: &mut Vec<DependencyEdge>,
    ) {
        let node = cursor.node();

        match node.kind() {
            "use_declaration" => {
                // Extract import information
                if let Ok(text) = node.utf8_text(code.as_bytes()) {
                    // Simple extraction: get the imported module name
                    let import_name = text
                        .trim_start_matches("use ")
                        .trim_end_matches(';')
                        .split("::")
                        .next()
                        .unwrap_or("unknown")
                        .to_string();

                    edges.push(DependencyEdge {
                        from: file_name.to_string(),
                        to: import_name,
                        edge_type: EdgeType::Import,
                        line: node.start_position().row + 1,
                    });
                }
            }
            "call_expression" => {
                // Extract function call
                if let Some(function_node) = node.child_by_field_name("function") {
                    if let Ok(text) = function_node.utf8_text(code.as_bytes()) {
                        edges.push(DependencyEdge {
                            from: file_name.to_string(),
                            to: text.to_string(),
                            edge_type: EdgeType::FunctionCall,
                            line: node.start_position().row + 1,
                        });
                    }
                }
            }
            "impl_item" => {
                // Extract trait implementations
                if let Some(trait_node) = node.child_by_field_name("trait") {
                    if let Ok(text) = trait_node.utf8_text(code.as_bytes()) {
                        edges.push(DependencyEdge {
                            from: file_name.to_string(),
                            to: text.to_string(),
                            edge_type: EdgeType::TraitImplementation,
                            line: node.start_position().row + 1,
                        });
                    }
                }
            }
            "struct_item" => {
                // Extract struct definition
                if let Some(name_node) = node.child_by_field_name("name") {
                    if let Ok(text) = name_node.utf8_text(code.as_bytes()) {
                        edges.push(DependencyEdge {
                            from: file_name.to_string(),
                            to: text.to_string(),
                            edge_type: EdgeType::StructDefinition,
                            line: node.start_position().row + 1,
                        });
                    }
                }
            }
            "enum_item" => {
                // Extract enum definition
                if let Some(name_node) = node.child_by_field_name("name") {
                    if let Ok(text) = name_node.utf8_text(code.as_bytes()) {
                        edges.push(DependencyEdge {
                            from: file_name.to_string(),
                            to: text.to_string(),
                            edge_type: EdgeType::EnumDefinition,
                            line: node.start_position().row + 1,
                        });
                    }
                }
            }
            _ => {}
        }

        // Recurse into children
        if cursor.goto_first_child() {
            loop {
                Self::traverse_node(cursor, code, file_name, edges);
                if !cursor.goto_next_sibling() {
                    break;
                }
            }
            cursor.goto_parent();
        }
    }

    /// Build a dependency graph from multiple code snippets with depth control
    pub fn build_graph(
        &mut self,
        snippets: &[(String, String)],
        max_depth: Option<u32>,
    ) -> HashMap<String, HashSet<String>> {
        let mut graph: HashMap<String, HashSet<String>> = HashMap::new();
        let mut visited = HashSet::new();
        let max_depth = max_depth.unwrap_or(3); // Default depth of 3

        // First pass: extract all direct dependencies
        for (file_name, code) in snippets {
            let edges = self.analyze_rust_code(code, file_name);

            for edge in edges {
                graph.entry(edge.from.clone()).or_default().insert(edge.to.clone());
                visited.insert(edge.from.clone());
            }
        }

        // If depth > 1, expand transitive dependencies
        if max_depth > 1 {
            self.expand_dependencies(&mut graph, &visited, max_depth, 1);
        }

        graph
    }

    /// Recursively expand dependencies up to max_depth
    fn expand_dependencies(
        &mut self,
        graph: &mut HashMap<String, HashSet<String>>,
        visited: &HashSet<String>,
        max_depth: u32,
        current_depth: u32,
    ) {
        if current_depth >= max_depth {
            return;
        }

        let mut new_deps = HashSet::new();

        // Find dependencies that need expansion
        for deps in graph.values() {
            for dep in deps {
                if !visited.contains(dep) && !graph.contains_key(dep) {
                    new_deps.insert(dep.clone());
                }
            }
        }

        // For each new dependency, try to find its definition in our snippets
        for dep in &new_deps {
            // Look for this dependency in our code snippets
            for (file_name, code) in self.find_snippet_by_name(dep) {
                let edges = self.analyze_rust_code(&code, &file_name);

                for edge in edges {
                    if edge.from == *dep {
                        graph.entry(edge.from.clone()).or_default().insert(edge.to.clone());
                    }
                }
            }
        }

        // Recurse if we found new dependencies
        if !new_deps.is_empty() {
            self.expand_dependencies(graph, visited, max_depth, current_depth + 1);
        }
    }

    /// Helper to find code snippets by dependency name
    fn find_snippet_by_name(&self, _name: &str) -> Vec<(String, String)> {
        // This is a simplified implementation - in a real system you'd have
        // a proper index of all available code
        vec![] // For now, return empty - depth expansion needs external data
    }

    /// Generate Mermaid diagram from dependency graph
    pub fn to_mermaid(&self, graph: &HashMap<String, HashSet<String>>) -> String {
        let mut output = String::from("```mermaid\ngraph TD;\n");

        for (from, tos) in graph {
            let from_clean = from.replace(|c: char| !c.is_alphanumeric(), "_");
            for to in tos {
                let to_clean = to.replace(|c: char| !c.is_alphanumeric(), "_");
                output.push_str(&format!("    {} --> {};\n", from_clean, to_clean));
            }
        }

        output.push_str("```\n");
        output
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_rust_import_detection() {
        let mut analyzer = CodeGraphAnalyzer::new().unwrap();
        let code = r#"
            use std::collections::HashMap;
            use tokio::sync::Mutex;
        "#;

        let edges = analyzer.analyze_rust_code(code, "test.rs");
        assert!(!edges.is_empty());
        assert!(edges.iter().any(|e| e.edge_type == EdgeType::Import));
    }

    #[test]
    fn test_function_call_detection() {
        let mut analyzer = CodeGraphAnalyzer::new().unwrap();
        let code = r#"
            fn main() {
                println!("Hello");
                process_data();
            }
        "#;

        let edges = analyzer.analyze_rust_code(code, "main.rs");
        let calls: Vec<_> = edges
            .iter()
            .filter(|e| e.edge_type == EdgeType::FunctionCall)
            .collect();
        assert!(!calls.is_empty());
    }

    #[test]
    fn test_struct_definition_detection() {
        let mut analyzer = CodeGraphAnalyzer::new().unwrap();
        let code = r#"
            pub struct MyStruct {
                field: i32,
            }
        "#;

        let edges = analyzer.analyze_rust_code(code, "struct.rs");
        let defs: Vec<_> = edges
            .iter()
            .filter(|e| e.edge_type == EdgeType::StructDefinition)
            .collect();
        assert_eq!(defs.len(), 1);
        assert_eq!(defs[0].to, "MyStruct");
    }

    #[test]
    fn test_enum_definition_detection() {
        let mut analyzer = CodeGraphAnalyzer::new().unwrap();
        let code = r#"
            enum MyEnum {
                Variant1,
                Variant2,
            }
        "#;

        let edges = analyzer.analyze_rust_code(code, "enum.rs");
        let defs: Vec<_> = edges
            .iter()
            .filter(|e| e.edge_type == EdgeType::EnumDefinition)
            .collect();
        assert_eq!(defs.len(), 1);
        assert_eq!(defs[0].to, "MyEnum");
    }
}
