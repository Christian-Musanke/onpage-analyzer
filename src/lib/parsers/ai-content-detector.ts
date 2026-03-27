import type { AiContentMetrics } from "@/lib/types";

/**
 * Common phrases and patterns frequently used by AI language models.
 * Each entry is a lowercased substring to search for in the visible text.
 */
const AI_PHRASES_DE = [
  "es ist wichtig zu beachten",
  "es ist erwähnenswert",
  "zusammenfassend lässt sich sagen",
  "in der heutigen digitalen welt",
  "in der heutigen zeit",
  "es ist wichtig zu betonen",
  "abschließend lässt sich sagen",
  "lassen sie uns einen blick",
  "es gibt verschiedene möglichkeiten",
  "es gibt eine vielzahl von",
  "darüber hinaus ist es wichtig",
  "in diesem zusammenhang ist es wichtig",
  "es sei darauf hingewiesen",
  "es ist unbestreitbar",
  "nicht zuletzt ist es wichtig",
  "es bleibt abzuwarten",
  "spielen eine entscheidende rolle",
  "spielt eine entscheidende rolle",
  "in einer welt, in der",
  "dies ermöglicht es",
];

const AI_PHRASES_EN = [
  "it's important to note",
  "it is important to note",
  "it's worth noting",
  "it is worth noting",
  "in today's digital landscape",
  "in today's fast-paced world",
  "in conclusion",
  "let's delve into",
  "let's dive into",
  "there are several ways",
  "there are a number of",
  "furthermore, it is important",
  "it should be noted",
  "it is undeniable",
  "last but not least",
  "it remains to be seen",
  "plays a crucial role",
  "play a crucial role",
  "in a world where",
  "this allows for",
  "this enables",
  "navigating the complexities",
  "the landscape of",
  "a testament to",
  "serves as a reminder",
];

const ALL_AI_PHRASES = [...AI_PHRASES_DE, ...AI_PHRASES_EN];

/**
 * Detect statistical indicators of AI-generated content.
 *
 * Uses three heuristic signals:
 * 1. **Vocabulary diversity** (Type-Token Ratio) — AI text tends to reuse
 *    vocabulary more uniformly than human-written text.
 * 2. **Sentence length uniformity** — AI produces sentences with low variance
 *    in length; human writing is more "bursty".
 * 3. **AI phrase patterns** — Common formulaic phrases that language models
 *    tend to produce.
 *
 * These heuristics are indicative, not definitive. The resulting score is a
 * rough probability estimate, not a classification.
 */
export function detectAiContent(
  visibleText: string,
  words: string[],
): AiContentMetrics {
  if (words.length < 50) {
    return {
      score: 0,
      vocabularyDiversity: 0,
      sentenceLengthStdDev: 0,
      aiPhraseCount: 0,
      aiPhrases: [],
    };
  }

  const vocabularyDiversity = computeVocabularyDiversity(words);
  const sentenceLengthStdDev = computeSentenceLengthStdDev(visibleText);
  const { count: aiPhraseCount, phrases: aiPhrases } =
    detectAiPhrases(visibleText);

  const score = computeOverallScore(
    vocabularyDiversity,
    sentenceLengthStdDev,
    aiPhraseCount,
    words.length,
  );

  return {
    score,
    vocabularyDiversity: Math.round(vocabularyDiversity * 1000) / 1000,
    sentenceLengthStdDev: Math.round(sentenceLengthStdDev * 100) / 100,
    aiPhraseCount,
    aiPhrases,
  };
}

/**
 * Type-Token Ratio: unique words / total words.
 * Sampled on a rolling window to avoid length bias.
 */
function computeVocabularyDiversity(words: string[]): number {
  const WINDOW = 500;
  const lowered = words.map((w) => w.toLowerCase());

  if (lowered.length <= WINDOW) {
    const unique = new Set(lowered);
    return unique.size / lowered.length;
  }

  // Average TTR over multiple windows to reduce length bias
  let sum = 0;
  let count = 0;
  for (let i = 0; i + WINDOW <= lowered.length; i += WINDOW) {
    const window = lowered.slice(i, i + WINDOW);
    const unique = new Set(window);
    sum += unique.size / window.length;
    count++;
  }
  return sum / count;
}

/**
 * Standard deviation of sentence lengths (in words).
 */
function computeSentenceLengthStdDev(text: string): number {
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (sentences.length < 3) return 0;

  const lengths = sentences.map(
    (s) => s.split(/\s+/).filter((w) => w.length > 0).length,
  );

  const mean = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((sum, len) => sum + (len - mean) ** 2, 0) / lengths.length;
  return Math.sqrt(variance);
}

/**
 * Find AI-typical phrases in the text.
 */
function detectAiPhrases(text: string): {
  count: number;
  phrases: string[];
} {
  const lower = text.toLowerCase();
  const found: string[] = [];

  for (const phrase of ALL_AI_PHRASES) {
    if (lower.includes(phrase)) {
      found.push(phrase);
    }
  }

  return { count: found.length, phrases: found };
}

/**
 * Combine the three signals into a 0-100 score.
 *
 * Weights:
 * - Vocabulary diversity: 35% (lower TTR → higher AI probability)
 * - Sentence uniformity: 35% (lower std dev → higher AI probability)
 * - AI phrases: 30% (more phrases → higher AI probability)
 */
function computeOverallScore(
  ttr: number,
  stdDev: number,
  phraseCount: number,
  wordCount: number,
): number {
  // TTR component: typical human 0.55-0.75, typical AI 0.35-0.50
  // Map to 0-100 where low TTR = high AI score
  const ttrScore = clamp(mapRange(ttr, 0.7, 0.35, 0, 100));

  // Sentence uniformity: typical human stdDev 8-15+, typical AI 3-7
  // Map to 0-100 where low stdDev = high AI score
  const uniformityScore = clamp(mapRange(stdDev, 14, 4, 0, 100));

  // Phrase count: normalize by text length (per 1000 words)
  const phrasesPerK = (phraseCount / wordCount) * 1000;
  const phraseScore = clamp(mapRange(phrasesPerK, 0, 5, 0, 100));

  const weighted =
    ttrScore * 0.35 + uniformityScore * 0.35 + phraseScore * 0.3;

  return Math.round(clamp(weighted));
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value));
}

function mapRange(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}
