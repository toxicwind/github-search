use clap::{Parser, Subcommand, ValueEnum};
use std::path::PathBuf;
use gh_search_core::orchestrator::{execute_unified_search, UnifiedSearchArgs};
use gh_search_core::{GitHubSearchClient, SearchCategory, SearchResult};
use indicatif::{ProgressBar, ProgressStyle};
use std::env;
use tracing::Level;
use tracing_subscriber::FmtSubscriber;

use gh_search_core::config::Config;

mod server;
#[cfg(feature = "mcp")]
mod mcp_server;

#[derive(Parser)]
#[command(name = "gh-search")]
#[command(author = "HypeBrut Labs")]
#[command(version = "0.3.0")]
#[command(about = "GitHub Advanced Search API & CLI", long_about = None)]
struct Cli {
    #[command(subcommand)]
    command: Commands,

    /// Path to explicit .env config file
    #[arg(long, global = true)]
    config_file: Option<String>,

    /// GitHub Personal Access Token (or set GITHUB_TOKEN env)
    #[arg(long, env = "GITHUB_TOKEN", global = true)]
    token: Option<String>,

    /// Verbose logging
    #[arg(short, long, global = true)]
    verbose: bool,

    /// Data directory for cache and state
    #[arg(long, global = true)]
    data_dir: Option<String>,

    /// Enable live tracing to stderr
    #[arg(long, global = true)]
    live_trace: bool,
}

#[derive(Subcommand)]
enum Commands {
    /// Execute a search query
    Query {
        /// The search query
        query: String,

        /// Categories to search (can be specified multiple times)
        #[arg(short = 't', long = "category", value_enum)]
        categories: Vec<CategoryArg>,

        /// Number of results per category (alias: --per-page)
        #[arg(short, long, aliases = ["per-page"], visible_alias = "per-page", default_value = "10")]
        limit: u32,

        /// [Default: ON] Enable smart connected-file discovery. Use --no-smart to disable.
        #[arg(long, default_value_t = true)]
        smart: bool,

        /// Disable smart connected-file discovery
        #[arg(long, overrides_with = "smart", action = clap::ArgAction::SetFalse)]
        no_smart: bool,

        /// Use human-readable output (default: true for CLI)
        #[arg(long, default_value_t = true)]
        human: bool,

        /// Disable human-readable output (show JSON)
        #[arg(long)]
        no_human: bool,

        /// Raw mode: skip custom scoring/ranking, return GitHub API order as-is
        #[arg(long)]
        raw: bool,

        /// Enable experimental heuristic-heavy ranking (BM25, identifier split, popularity).
        #[arg(long, default_value_t = false)]
        experimental_ranking: bool,

        /// LLM mode: disable spinner + markdown, emit JSON only (can also set GH_SEARCH_LLM_MODE=1)
        #[arg(long, default_value_t = false)]
        llm: bool,
    },
    /// Start the web API server with OpenAPI docs and frontend
    Serve {
        /// Port to listen on
        #[arg(short, long, default_value = "16100")]
        port: u16,

        /// Bind address
        #[arg(long, default_value = "0.0.0.0")]
        host: String,
    },
    #[cfg(feature = "mcp")]
    /// Start the MCP server for AI assistants
    Mcp {
        /// Run in HTTP mode instead of Stdio
        #[arg(long)]
        http: bool,

        /// Port for HTTP server (when using --http)
        #[arg(long, default_value = "42305")]
        port: u16,

        /// Host to bind to (when using --http)
        #[arg(long, default_value = "0.0.0.0")]
        host: String,
    },
}

#[derive(Copy, Clone, PartialEq, Eq, PartialOrd, Ord, ValueEnum)]
enum CategoryArg {
    Repo,
    Code,
    Issue,
    User,
}

impl std::fmt::Display for CategoryArg {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            CategoryArg::Repo => "repo",
            CategoryArg::Code => "code",
            CategoryArg::Issue => "issue",
            CategoryArg::User => "user",
        };
        write!(f, "{}", s)
    }
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // 1. Explicit Config Loading
    let pre_parse = Cli::parse();

    load_env(pre_parse.config_file.as_ref());

    // Parse AGAIN to populate struct fields from loaded environment variables
    let cli = Cli::parse();

    // Setup logging
    let (level, ansi) = if cli.live_trace || cli.verbose {
        (Level::DEBUG, true)
    } else {
        (Level::WARN, false)
    };

    let builder = FmtSubscriber::builder()
        .with_max_level(level)
        .with_ansi(ansi)
        .with_target(cli.live_trace); // Show targets only in live trace

    if cli.live_trace {
        // In live trace mode, write to stderr so we don't pollute stdout JSON
        let subscriber = builder.with_writer(std::io::stderr).finish();
        tracing::subscriber::set_global_default(subscriber)
            .expect("setting default subscriber failed");
    } else {
        let subscriber = builder.finish();
        tracing::subscriber::set_global_default(subscriber)
            .expect("setting default subscriber failed");
    }

    match cli.command {
        Commands::Query {
            query,
            categories,
            limit,
            smart,
            human,
            no_human,
            raw,
            experimental_ranking,
            llm,
            ..
        } => {
            let env_llm = env_flag("GH_SEARCH_LLM_MODE");
            let llm_mode = llm || env_llm;
            let human_output = if llm_mode { false } else { human && !no_human };

            let client = GitHubSearchClient::new(cli.token);
            let cats: Option<Vec<String>> = if categories.is_empty() {
                None
            } else {
                Some(categories.into_iter().map(|c| c.to_string()).collect())
            };

            let config = Config::from_env();

            use std::io::IsTerminal;
            let spinner = if human_output && !llm_mode && std::io::stderr().is_terminal() {
                let s = ProgressBar::new_spinner();
                s.set_style(
                    ProgressStyle::default_spinner()
                        .template("{spinner:.green} {msg}")?
                        .tick_strings(&["|", "/", "-", "\\"]),
                );
                s.enable_steady_tick(std::time::Duration::from_millis(config.spinner_tick_ms));
                s.set_message("Searching GitHub...");
                Some(s)
            } else {
                None
            };

            let unified_args = UnifiedSearchArgs {
                query: query.clone(),
                categories: cats,
                per_page: Some(limit),
                raw: Some(raw),
                smart: Some(smart),
                recursive: Some(smart),
                experimental: Some(experimental_ranking),
            };

            let results = execute_unified_search(&client, unified_args).await?;

            if let Some(s) = spinner {
                s.finish_and_clear();
            }

            if human_output {
                print_results_markdown(&results);
            } else {
                println!("{}", serde_json::to_string(&results)?);
            }
        }

        Commands::Serve { port, host } => {
            server::run_server(host, port, cli.token).await?;
        }
        #[cfg(feature = "mcp")]
        Commands::Mcp { http, port, host } => {
            if http {
                mcp_server::run_mcp_http_server(cli.token, host, port).await?;
            } else {
                mcp_server::run_mcp_server(cli.token).await?;
            }
        }
    }
    Ok(())
}

fn env_flag(name: &str) -> bool {
    match env::var(name) {
        Ok(val) => matches!(val.to_lowercase().as_str(), "1" | "true" | "yes" | "on"),
        Err(_) => false,
    }
}

fn load_env(config_file: Option<&PathBuf>) {
    if let Some(cfg_path) = config_file {
        dotenvy::from_filename(cfg_path).expect("Failed to load specified config file");
        return;
    }

    if let Ok(explicit) = env::var("GH_SEARCH_CONFIG_FILE") {
        let _ = dotenvy::from_filename(explicit);
        return;
    }

    if dotenvy::dotenv().is_ok() {
        return;
    }

    if let Ok(exe_path) = env::current_exe() {
        if let Some(exe_dir) = exe_path.parent() {
            let candidates = [
                exe_dir.join(".env"),
                exe_dir.join("..").join(".env"),
                exe_dir.join("..").join("..").join(".env"),
            ];
            for candidate in candidates {
                if dotenvy::from_filename(&candidate).is_ok() {
                    return;
                }
            }
        }
    }
}

fn print_results_markdown(results: &[SearchResult]) {
    if results.is_empty() {
        println!("> [!NOTE]\n> No results found.");
        return;
    }

    println!("# GitHub Search Results\n");

    for (i, res) in results.iter().enumerate() {
        let label = match res.category {
            SearchCategory::Repositories => "Repository",
            SearchCategory::Code => "Code Snippet",
            SearchCategory::Issues => "Issue/PR",
            SearchCategory::PullRequests => "Pull Request",
            SearchCategory::Users => "User Profile",
            SearchCategory::Discussions => "Discussion",
            SearchCategory::Commits => "Commit",
            SearchCategory::Packages => "Package",
            SearchCategory::Wikis => "Wiki",
            SearchCategory::Topics => "Topic",
            SearchCategory::Marketplace => "Marketplace Listing",
            SearchCategory::Unified => "Unified Result",
        };

        println!("## {}. {}: {}", i + 1, label, res.title);
        println!("- **URL**: {}", res.url);
        println!(
            "- **Readability**: {:.1}/4.0",
            res.score_breakdown.readability
        );

        if let Some(sub) = &res.subtitle {
            println!("- **Description**: {}", sub);
        }

        if let Some(snip) = &res.snippet {
            println!("\n### Content Snippet\n```\n{}\n```", snip.trim());
        }
        println!("\n---");
    }

    println!(
        "\n**Summary**: Found {} results across {} categories.",
        results.len(),
        results
            .iter()
            .map(|r| format!("{:?}", r.category))
            .collect::<std::collections::HashSet<_>>()
            .len()
    );
}
