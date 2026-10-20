use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct InputItem {
    pub score: Option<f64>,
    pub name: Option<String>,
    pub path: Option<String>,
    pub html_url: Option<String>,
    pub repository: Option<InputRepo>,
    pub language: Option<String>,
    pub stargazers_count: Option<u32>,
    pub updated_at: Option<String>,
    pub description: Option<String>,
    pub text_matches: Option<Vec<InputTextMatch>>,
}

#[derive(Deserialize)]
pub struct InputRepo {
    pub full_name: Option<String>,
    pub stargazers_count: Option<u32>,
}

#[derive(Deserialize)]
pub struct InputTextMatch {
    pub fragment: Option<String>,
}

#[derive(Deserialize)]
pub struct EngineRequest {
    pub method: String,
    pub query: String,
    pub items: Vec<InputItem>,
}

#[derive(Serialize)]
pub struct RankedItem {
    pub name: Option<String>,
    pub path: Option<String>,
    pub html_url: Option<String>,
    pub repository: Option<String>,
    pub score: f64,
    pub ml_score: f64,
    pub text_match: f64,
    pub star_score: f64,
    pub recency_score: f64,
    pub language: Option<String>,
    pub evaluation: String,
    pub is_emergent: bool,
}

#[derive(Serialize)]
pub struct EngineResponse {
    pub ok: bool,
    pub method: String,
    pub results: Vec<RankedItem>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}
