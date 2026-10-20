# Rust CLI Patterns from github-advanced-search-mcp

Extracted from old `crates/cli` during project consolidation.

## Clap CLI with Optional Positional + Subcommands

```rust
#[derive(Parser, Debug)]
#[command(
    author,
    version,
    about = "Rusty GitHub search orchestrator",
    after_help = "Example: gh-search --query \"rust\" --category code"
)]
struct Cli {
    #[command(subcommand)]
    command: Option<Command>,

    /// GitHub search query (optional - for non-subcommand mode)
    #[arg(short, long)]
    query: Option<String>,

    /// Categories to search
    #[arg(long = "category", value_enum)]
    categories: Vec<CategoryArg>,
}
```

## Dev Subcommand Pattern

```rust
mod dev;

#[derive(Subcommand, Debug)]
enum Command {
    Dev(dev::DevCommand),
}

// In main:
if let Some(command) = command {
    match command {
        Command::Dev(cmd) => {
            dev::run(cmd)?;
            return Ok(());
        }
    }
}
```

## Category Enum with ValueEnum

```rust
#[derive(Copy, Clone, Debug, ValueEnum)]
enum CategoryArg {
    Repositories,
    Code,
}

impl From<CategoryArg> for SearchCategory {
    fn from(value: CategoryArg) -> Self {
        match value {
            CategoryArg::Repositories => SearchCategory::Repositories,
            CategoryArg::Code => SearchCategory::Code,
        }
    }
}
```

## Progress Spinner

```rust
use indicatif::ProgressBar;

let spinner = ProgressBar::new_spinner();
spinner.set_message("Searching...");
spinner.enable_steady_tick(std::time::Duration::from_millis(80));
// ... work ...
spinner.finish_and_clear();
```
