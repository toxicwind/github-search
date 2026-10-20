/** CamelCase / snake_case identifier tokenization (from ranking.rs). */

export function splitIdentifier(token: string): string[] {
  const parts: string[] = [];
  for (const chunk of token.split("_")) {
    if (!chunk) continue;
    let buf = "";
    for (const ch of chunk) {
      const isBoundary =
        ch === ch.toUpperCase() &&
        ch !== ch.toLowerCase() &&
        buf.length > 0 &&
        (() => {
          const prev = buf[buf.length - 1];
          return prev === prev.toLowerCase() && prev !== prev.toUpperCase();
        })();
      if (isBoundary) {
        parts.push(buf.toLowerCase());
        buf = "";
      }
      buf += ch;
    }
    if (buf) parts.push(buf.toLowerCase());
  }
  return parts;
}

export function tokenizeWithIdents(query: string): string[] {
  return query
    .split(/[^a-zA-Z0-9+#]+/)
    .flatMap(splitIdentifier)
    .filter((s) => s.length > 1)
    .map((s) => s.toLowerCase());
}

export function identifierTokens(text: string): string[] {
  return text
    .split(/[^a-zA-Z0-9_]+/)
    .flatMap(splitIdentifier)
    .filter((s) => s.length > 1)
    .map((s) => s.toLowerCase());
}
