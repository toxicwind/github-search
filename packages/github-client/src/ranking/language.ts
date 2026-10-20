/** Language affinity from ranking.rs */

const LANGUAGE_MAP: Array<[string, string]> = [
  ["rust", "Rust"],
  ["golang", "Go"],
  ["go", "Go"],
  ["python", "Python"],
  ["py", "Python"],
  ["typescript", "TypeScript"],
  ["ts", "TypeScript"],
  ["javascript", "JavaScript"],
  ["js", "JavaScript"],
  ["java", "Java"],
  ["kotlin", "Kotlin"],
  ["swift", "Swift"],
  ["cpp", "C++"],
  ["cxx", "C++"],
  ["c#", "C#"],
  ["csharp", "C#"],
  ["ruby", "Ruby"],
  ["rb", "Ruby"],
  ["php", "PHP"],
  ["scala", "Scala"],
  ["elixir", "Elixir"],
  ["haskell", "Haskell"],
  ["dart", "Dart"],
];

export function detectQueryLanguage(query: string): string | undefined {
  const lower = query.toLowerCase();
  if (lower.includes("c++")) return "C++";
  const parts = lower.split(/[^a-z0-9#]+/);
  for (const [needle, lang] of LANGUAGE_MAP) {
    if (parts.includes(needle)) return lang;
  }
  return undefined;
}

export function languageAffinityBonus(
  queryLang: string | undefined,
  localLang: string | undefined,
  resultLang: string | undefined,
): number {
  if (!resultLang) return 0;
  if (queryLang && queryLang.toLowerCase() === resultLang.toLowerCase()) {
    return 5.0;
  }
  if (localLang && localLang.toLowerCase() === resultLang.toLowerCase()) {
    return 3.0;
  }
  return 0;
}
