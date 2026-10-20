/// Detects the primary language of the project in the current working directory.
pub fn detect_local_language() -> Option<String> {
    let cwd = std::env::current_dir().ok()?;

    if cwd.join("Cargo.toml").exists() {
        return Some("Rust".to_string());
    }
    if cwd.join("package.json").exists() {
        // Could distinguish TS vs JS but let's say TypeScript if tsconfig exists
        if cwd.join("tsconfig.json").exists() {
            return Some("TypeScript".to_string());
        }
        return Some("JavaScript".to_string());
    }
    if cwd.join("go.mod").exists() {
        return Some("Go".to_string());
    }
    if cwd.join("pyproject.toml").exists() || cwd.join("requirements.txt").exists() {
        return Some("Python".to_string());
    }
    if cwd.join("pom.xml").exists() || cwd.join("build.gradle").exists() {
        return Some("Java".to_string());
    }
    if cwd.join("Gemfile").exists() {
        return Some("Ruby".to_string());
    }
    if cwd.join("composer.json").exists() {
        return Some("PHP".to_string());
    }

    None
}
