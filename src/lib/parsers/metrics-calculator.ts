import type { CheerioAPI } from "cheerio";
import type { LinkData, PageMetrics, KeywordEntry } from "@/lib/types";
import { STOP_WORDS, TOP_KEYWORDS_COUNT, MIN_KEYWORD_LENGTH } from "@/lib/constants";
import { detectAiContent } from "./ai-content-detector";

export function calculateMetrics(
  $: CheerioAPI,
  html: string,
  links: LinkData[],
  loadTimeMs: number,
): PageMetrics {
  // Strip script/style content before extracting visible text
  const body = $("body").clone();
  body.find("script, style, noscript").remove();
  const visibleText = body.text();

  // Tokenise into words
  const words = visibleText
    .split(/\s+/)
    .map((w) => w.replace(/[^\p{L}\p{N}'-]/gu, ""))
    .filter((w) => w.length > 0);

  const wordCount = words.length;

  // Text-to-HTML ratio (percentage)
  const textLength = visibleText.replace(/\s+/g, " ").trim().length;
  const htmlLength = html.length;
  const textToHtmlRatio = htmlLength > 0 ? (textLength / htmlLength) * 100 : 0;

  // Link counts
  const internalLinkCount = links.filter((l) => l.isInternal).length;
  const externalLinkCount = links.filter((l) => !l.isInternal).length;

  // Top keywords
  const topKeywords = computeTopKeywords(words);

  // Readability (Flesch-Amstad for German)
  const readabilityScore = computeReadability(visibleText, words);

  // AI content detection
  const aiContent = detectAiContent(visibleText, words);

  // Page size
  const pageSizeBytes = Buffer.byteLength(html, "utf-8");

  return {
    wordCount,
    internalLinkCount,
    externalLinkCount,
    textToHtmlRatio: Math.round(textToHtmlRatio * 100) / 100,
    topKeywords,
    readabilityScore,
    pageSizeBytes,
    loadTimeMs,
    aiContent,
  };
}

/** Count syllables using vowel-group heuristic (works for German & English). */
function countSyllables(word: string): number {
  const vowelGroups = word.toLowerCase().match(/[aeiouyäöü]+/g);
  return Math.max(1, vowelGroups?.length ?? 1);
}

/** Flesch-Amstad readability score adapted for German text. */
function computeReadability(text: string, words: string[]): number {
  if (words.length === 0) return 0;

  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  const sentenceCount = Math.max(1, sentences.length);
  const totalSyllables = words.reduce((sum, w) => sum + countSyllables(w), 0);

  const asl = words.length / sentenceCount;
  const asw = totalSyllables / words.length;

  // Flesch-Amstad formula for German
  const score = 180 - asl - 58.5 * asw;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function computeTopKeywords(words: string[]): KeywordEntry[] {
  const freq = new Map<string, number>();

  for (const raw of words) {
    const w = raw.toLowerCase();
    if (w.length < MIN_KEYWORD_LENGTH) continue;
    if (STOP_WORDS.has(w)) continue;
    freq.set(w, (freq.get(w) ?? 0) + 1);
  }

  const totalWords = words.length || 1;

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_KEYWORDS_COUNT)
    .map(([word, count]) => ({
      word,
      count,
      density: Math.round((count / totalWords) * 10000) / 100, // percentage with 2 decimals
    }));
}
