"use client"

import { Button } from "@/components/ui/button"
import { useLang } from "@/components/lang-provider"

export function LangToggle() {
  const { lang, switchLang, t } = useLang()

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => switchLang(lang === "de" ? "en" : "de")}
      aria-label={t.langToggle.switchLang}
      className="shrink-0"
    >
      <span className="text-xs font-semibold">{lang.toUpperCase()}</span>
    </Button>
  )
}
