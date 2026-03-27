# Changelog

## v0.6.0

### New Features

- **Headline Links Filter** — New toggle in graph settings ("Only Headline Links") that filters the canvas to only show links appearing inside a heading section, hiding navigation, footer, and other non-content links.

- **AI Content Detection** — New "KI-Inhalt / AI Content" metric card in the Metriken section. Uses server-side statistical heuristics (vocabulary diversity, sentence length variance, AI phrase pattern matching) to estimate AI-generated content probability. Includes a detailed modal with sub-metric breakdown and detected phrases.

- **Schema.org Validation** — The Structured Data section now validates JSON-LD for common authoring mistakes:
  - JSON syntax issues (trailing commas, single quotes, unescaped control characters)
  - Missing or invalid `@context` and `@type`
  - Missing required and recommended properties per schema type (Article, Product, Organization, FAQPage, and 12 more)
  - Nested objects missing `@type` (e.g. author, publisher)
  - Non-absolute URLs in URL-type fields
  - Invalid ISO 8601 date formats
  - Malformed JSON-LD blocks are now captured as error items instead of silently skipped

- **Article Metadata in SEO Basics** — The SEO-Grundlagen section now displays article dates (published, last modified, created) and author/editor/reviewer names, extracted from schema.org structured data with fallback to Open Graph and Dublin Core meta tags.

### Changed

- `SchemaItem` type now includes an `issues` array for validation results.
- `PageMetrics` type now includes `aiContent` with detailed heuristic sub-scores.
- `SeoData` type now includes `articleMeta` for article dates and authors.
- `GraphSettings` type now includes `onlyHeadlineLinks` option.
- `AnalyzerGraph` now accepts a `headings` prop for headline link filtering.

### New Files

- `src/lib/parsers/ai-content-detector.ts` — Statistical AI content detection engine.
- `src/lib/parsers/schema-validator.ts` — Schema.org validation rules and JSON-LD syntax checks.

## v0.5.0

- First online version

## v0.1.0

- inital commit