export type ExpandedQuery = {
  query: string;
  categories: string[];
  strict: boolean;
  exclusions: string[];
  score_profile: string;
};

export const QUERY_PACKS: Record<string, ExpandedQuery[]> = {
  "uwsm-compositor": [
    {
      query: "uwsm hyprland session desktop file systemd user wayland portals",
      categories: ["code", "repositories"],
      strict: true,
      exclusions: ["x11", "legacy"],
      score_profile: "session-runtime",
    },
    {
      query: "hyprland multi monitor focus workspace pointer movement dms",
      categories: ["code", "issues", "repositories"],
      strict: true,
      exclusions: ["single-monitor"],
      score_profile: "multimonitor-ux",
    },
  ],
  "mcp-ops": [
    {
      query:
        "modelcontextprotocol tmux runtime orchestration gateway diagnostics",
      categories: ["code", "repositories"],
      strict: true,
      exclusions: ["toy", "hello world"],
      score_profile: "runtime",
    },
    {
      query: "playwright mcp cdp attach headed profile persistent session",
      categories: ["code", "repositories"],
      strict: true,
      exclusions: ["headless only"],
      score_profile: "browser-control",
    },
  ],
  "agent-orchestration": [
    {
      query: "autonomous agent queue chaining task handoff context routing",
      categories: ["code", "repositories", "issues"],
      strict: true,
      exclusions: ["paper-only"],
      score_profile: "agentic",
    },
    {
      query: "operator bot workflow runbook remediation automation",
      categories: ["code", "repositories"],
      strict: true,
      exclusions: ["game bot"],
      score_profile: "ops-automation",
    },
  ],
  "browser-automation": [
    {
      query:
        "rebrowser playwright cdp attach persistent profile non-headless automation",
      categories: ["code", "repositories"],
      strict: true,
      exclusions: ["selenium-only"],
      score_profile: "cdp-attach",
    },
    {
      query: "playwright screenshot daemon live dashboard observability",
      categories: ["code", "repositories", "issues"],
      strict: true,
      exclusions: ["tutorial"],
      score_profile: "observability",
    },
  ],
};

export function expandPack(pack: string, seed = ""): ExpandedQuery[] {
  const base = QUERY_PACKS[pack] ?? [];
  if (!seed.trim()) return base;
  return base.map((entry) => ({
    ...entry,
    query: `${entry.query} ${seed}`.trim(),
  }));
}
