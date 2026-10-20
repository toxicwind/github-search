# Phase 11: Deep Scoring Archaeology - FINDINGS

## Missing Scoring Components (from Rust Core)

### 1. **Readability Score** (0-5 points)
**Purpose**: Identify well-documented, maintainable code vs minified/low-quality code.

**Heuristics**:
- **Documentation**: +1.5 if contains `//`, `/*`, `#`, `///`
- **Structural Complexity**: +1.0 for balanced `{}` (not excessive), +0.5 for `()`, +0.3 for `[]`
- **Code Keywords**: +0.5 if contains `fn`, `pub`, `struct`, `class`, `def`, `import`, etc.
- **Informational Density**: +1.0 if unique_words/total_words > 0.5 (not repetitive)
- **Minification Penalty**: -2.0 if any line > 300 chars

### 2. **Text Match Score**
- Measures how well the query matches the content
- Uses highlight count as proxy

### 3. **Fusion Score**
- Cross-signal synthesis (combining multiple weak signals)

### 4. **Context Score**
- Contextual relevance to the query

### 5. **Rarity Score**
- Uniqueness/niche value

## Star Bonus Formula
```
ln(stars + 1).min(6.0)
```
- Logarithmic scaling prevents mega-repos from dominating
- Caps at 6 points

## Recency Bonus Formula
```
freshness = ((365 - age_days) / 365).clamp(0, 1)
score = freshness * 6.0
```
- Projects updated within last year get up to 6 points
- Linear decay over 365 days

## Highlight Bonus
```
min(count, 6) * 0.5
```
- Each text match highlight adds 0.5 points (max 3.0)

## RECOMMENDATION
Port the `calculate_readability` function to Python. This will allow us to:
1. **Rank code by quality**, not just popularity
2. **Penalize minified/obfuscated code**
3. **Reward well-documented projects**
4. **Provide "Code Quality" as a filter dimension**
