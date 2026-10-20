use std::env;

/// Application configuration with sensible defaults
#[derive(Debug, Clone)]
pub struct Config {
    /// Spinner tick rate in milliseconds
    pub spinner_tick_ms: u64,
    /// Default results per page for HTTP API
    pub default_per_page: u32,
    /// Default results per page for WebSocket
    pub ws_default_limit: u32,
    /// Maximum snippet length in characters
    pub snippet_length: usize,
    /// Server host
    pub server_host: String,
    /// Server port
    pub server_port: u16,
    /// GitHub Token
    pub github_token: Option<String>,
    /// LLM API Base URL
    pub llm_api_base: String,
    /// LLM API Key
    pub llm_api_key: String,
    /// LLM Model
    pub llm_model: String,
    /// Data persistence directory
    pub data_dir: String,
}

impl Default for Config {
    fn default() -> Self {
        Self {
            spinner_tick_ms: 80,
            default_per_page: 10,
            ws_default_limit: 20,
            snippet_length: 200,
            server_host: "0.0.0.0".to_string(),
            server_port: 8080,
            github_token: None,
            llm_api_base: "http://localhost:30000/v1".to_string(),
            llm_api_key: "sk-local-hypebrut".to_string(),
            llm_model: "Qwen/Qwen2.5-14B-Instruct-AWQ".to_string(),
            data_dir: ".gh-search-data".to_string(),
        }
    }
}

impl Config {
    /// Load configuration from environment variables, falling back to defaults
    pub fn from_env() -> Self {
        let _ = dotenvy::dotenv();
        let mut config = Self::default();

        if let Ok(val) = env::var("GITHUB_TOKEN") {
            config.github_token = Some(val);
        }

        if let Ok(val) = env::var("GH_SEARCH_SPINNER_TICK_MS") {
            if let Ok(parsed) = val.parse() {
                config.spinner_tick_ms = parsed;
            }
        }
        if let Ok(val) = env::var("GH_SEARCH_DEFAULT_PER_PAGE") {
            if let Ok(parsed) = val.parse() {
                config.default_per_page = parsed;
            }
        }

        if let Ok(val) = env::var("GH_SEARCH_WS_DEFAULT_LIMIT") {
            if let Ok(parsed) = val.parse() {
                config.ws_default_limit = parsed;
            }
        }

        if let Ok(val) = env::var("GH_SEARCH_SNIPPET_LENGTH") {
            if let Ok(parsed) = val.parse() {
                config.snippet_length = parsed;
            }
        }

        if let Ok(val) = env::var("GH_SEARCH_SERVER_HOST") {
            config.server_host = val;
        }

        if let Ok(val) = env::var("GH_SEARCH_SERVER_PORT") {
            if let Ok(parsed) = val.parse() {
                config.server_port = parsed;
            }
        }

        if let Ok(val) = env::var("LLM_API_BASE") {
            config.llm_api_base = val;
        }

        if let Ok(val) = env::var("LLM_API_KEY") {
            config.llm_api_key = val;
        }

        if let Ok(val) = env::var("LLM_MODEL") {
            config.llm_model = val;
        }

        if let Ok(val) = env::var("GH_SEARCH_DATA_DIR") {
            config.data_dir = val;
        }

        config
    }
}
