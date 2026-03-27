import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

const locales = ["de", "en"]
const defaultLocale = "de"

function getLocale(request: NextRequest): string {
  // 1. Cookie preference (set by language switcher)
  const cookieLang = request.cookies.get("lang")?.value
  if (cookieLang && locales.includes(cookieLang)) return cookieLang

  // 2. Accept-Language header
  const acceptLang = request.headers.get("Accept-Language") ?? ""
  for (const part of acceptLang.split(",")) {
    const lang = part.split(";")[0].trim().slice(0, 2).toLowerCase()
    if (locales.includes(lang)) return lang
  }

  // 3. Fallback
  return defaultLocale
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Check if pathname already has a locale prefix
  const hasLocale = locales.some(
    (loc) => pathname.startsWith(`/${loc}/`) || pathname === `/${loc}`,
  )
  if (hasLocale) return NextResponse.next()

  // Redirect to locale-prefixed URL
  const locale = getLocale(request)
  const url = request.nextUrl.clone()
  url.pathname = `/${locale}${pathname}`
  return NextResponse.redirect(url)
}

export const config = {
  matcher: ["/((?!api|_next|favicon\\.ico|.*\\..*).*)"],
}
