use crate::SearchResult;
use reqwest::Client;
use serde_json::json;
use std::time::Duration;

#[derive(Clone)]
pub struct LlmClient {
    http: Client,
    base_url: String,
    token: String,
    model: String,
}

impl Default for LlmClient {
    fn default() -> Self {
        Self::new()
    }
}

impl LlmClient {
    pub fn new() -> Self {
        let config = crate::config::Config::from_env();
        Self {
            http: Client::builder()
                .timeout(Duration::from_secs(60))
                .build()
                .unwrap_or_default(),
            base_url: config.llm_api_base,
            token: config.llm_api_key,
            model: config.llm_model,
        }
    }

    pub fn with_base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = url.into();
        self
    }

    pub async fn summarize(&self, query: &str, results: &[SearchResult]) -> anyhow::Result<String> {
        let mut context = String::new();
        for (i, res) in results.iter().take(8).enumerate() {
            context.push_str(&format!(
                "{}. [{:?}] {} ({})\n   Snippet: {}\n\n",
                i + 1,
                res.category,
                res.title,
                res.url,
                res.snippet.as_deref().unwrap_or("No snippet")
            ));
        }

        let prompt = format!(
            "You are an expert developer assistant. Summarize the following GitHub search results for the query '{}'. \
            Synthesize the findings into a coherent report with 'Key Findings', 'Relevant Code', and 'Next Steps'. \
            Do not list results one by one. Use Markdown.\n\nResults:\n{}",
            query, context
        );

        self.chat_completion(prompt).await
    }

    pub async fn refine_query(
        &self,
        original_query: &str,
        error_context: &str,
    ) -> anyhow::Result<String> {
        let prompt = format!(
            "You are an expert search query optimizer. The user's query '{}' failed or returned poor results. \
            Context/Error: {}. \
            Suggest a better GitHub search query (using qualifiers like language:, path:, repo:). \
            Return ONLY the raw query string, no explanation.",
            original_query, error_context
        );
        self.chat_completion(prompt).await
    }

    async fn chat_completion(&self, prompt: String) -> anyhow::Result<String> {
        let body = json!({
            "model": self.model,
            "messages": [
                {"role": "system", "content": "You are a helpful, technical expert."},
                {"role": "user", "content": prompt}
            ],
            "temperature": 0.2,
            "max_tokens": 800
        });

        let resp = self
            .http
            .post(format!("{}/chat/completions", self.base_url))
            .header("Authorization", format!("Bearer {}", self.token))
            .json(&body)
            .send()
            .await?;

        if !resp.status().is_success() {
            let status = resp.status();
            let text = resp.text().await.unwrap_or_default();
            return Err(anyhow::anyhow!("LLM API Error {}: {}", status, text));
        }

        let json: serde_json::Value = resp.json().await?;
        let content = json["choices"][0]["message"]["content"]
            .as_str()
            .ok_or_else(|| anyhow::anyhow!("Invalid LLM response structure"))?;

        Ok(content.trim().to_string())
    }
}
