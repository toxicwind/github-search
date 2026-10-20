// Cycle 2: Dependency Graph Analyzer
// Beyond-baseline: Analyze code dependencies to suggest related searches

use std::collections::{HashMap, HashSet};

#[derive(Debug, Clone)]
pub struct DependencyNode {
    pub name: String,
    pub dependencies: Vec<String>,
    pub dependents: Vec<String>,
}

pub struct DependencyGraph {
    nodes: HashMap<String, DependencyNode>,
}

impl Default for DependencyGraph {
    fn default() -> Self {
        Self::new()
    }
}

impl DependencyGraph {
    pub fn new() -> Self {
        Self {
            nodes: HashMap::new(),
        }
    }

    pub fn add_dependency(&mut self, from: String, to: String) {
        self.nodes
            .entry(from.clone())
            .or_insert_with(|| DependencyNode {
                name: from.clone(),
                dependencies: Vec::new(),
                dependents: Vec::new(),
            })
            .dependencies
            .push(to.clone());

        self.nodes
            .entry(to.clone())
            .or_insert_with(|| DependencyNode {
                name: to.clone(),
                dependencies: Vec::new(),
                dependents: Vec::new(),
            })
            .dependents
            .push(from);
    }

    // Find transitive dependencies (what this depends on)
    pub fn transitive_dependencies(&self, node: &str) -> HashSet<String> {
        let mut visited = HashSet::new();
        let mut stack = vec![node.to_string()];

        while let Some(current) = stack.pop() {
            if visited.contains(&current) {
                continue;
            }
            visited.insert(current.clone());

            if let Some(node) = self.nodes.get(&current) {
                for dep in &node.dependencies {
                    stack.push(dep.clone());
                }
            }
        }

        visited.remove(node);
        visited
    }

    // Find reverse dependencies (what depends on this)
    pub fn reverse_dependencies(&self, node: &str) -> HashSet<String> {
        let mut visited = HashSet::new();
        let mut stack = vec![node.to_string()];

        while let Some(current) = stack.pop() {
            if visited.contains(&current) {
                continue;
            }
            visited.insert(current.clone());

            if let Some(node) = self.nodes.get(&current) {
                for dep in &node.dependents {
                    stack.push(dep.clone());
                }
            }
        }

        visited.remove(node);
        visited
    }
}
