"use client"

import { createContext, useCallback, useContext } from "react"
import type { Dictionary, Locale } from "@/lib/i18n"

interface LangContextValue {
  lang: Locale
  t: Dictionary
  switchLang: (locale: Locale) => void
}

const LangContext = createContext<LangContextValue | null>(null)

export function LangProvider({
  lang,
  dictionary,
  children,
}: {
  lang: Locale
  dictionary: Dictionary
  children: React.ReactNode
}) {
  const switchLang = useCallback(
    (locale: Locale) => {
      document.cookie = `lang=${locale};path=/;max-age=31536000;SameSite=Lax`
      const path = window.location.pathname.replace(/^\/(de|en)/, "")
      window.location.href = `/${locale}${path || ""}`
    },
    [],
  )

  return (
    <LangContext value={{ lang, t: dictionary, switchLang }}>
      {children}
    </LangContext>
  )
}

export function useLang(): LangContextValue {
  const ctx = useContext(LangContext)
  if (!ctx) throw new Error("useLang must be used within LangProvider")
  return ctx
}
