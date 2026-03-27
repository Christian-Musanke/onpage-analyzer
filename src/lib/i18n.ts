import type de from "@/dictionaries/de.json"

export type Locale = "de" | "en"
export type Dictionary = typeof de

export const locales: Locale[] = ["de", "en"]
export const defaultLocale: Locale = "de"

const loaders: Record<Locale, () => Promise<Dictionary>> = {
  de: () => import("@/dictionaries/de.json").then((m) => m.default),
  en: () => import("@/dictionaries/en.json").then((m) => m.default as Dictionary),
}

export async function getDictionary(locale: Locale): Promise<Dictionary> {
  return loaders[locale]()
}

/**
 * Interpolate `{key}` placeholders in a template string.
 *
 * @example interp("Found {count} items", { count: 5 }) // "Found 5 items"
 */
export function interp(
  template: string,
  vars: Record<string, string | number>,
): string {
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] != null ? String(vars[key]) : `{${key}}`,
  )
}
