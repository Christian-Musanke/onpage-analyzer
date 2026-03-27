import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { Geist, Geist_Mono } from "next/font/google"
import { Prata } from "next/font/google"
import { ThemeProvider } from "next-themes"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LangProvider } from "@/components/lang-provider"
import { getDictionary, locales, type Locale } from "@/lib/i18n"
import "../globals.css"

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
})

const prata = Prata({
  variable: "--font-heading",
  weight: "400",
  subsets: ["latin"],
})

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>
}): Promise<Metadata> {
  const { lang } = await params
  const locale = locales.includes(lang as Locale) ? (lang as Locale) : "de"
  const dict = await getDictionary(locale)

  return {
    title: dict.meta.title,
    description: dict.meta.description,
  }
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ lang: string }>
}) {
  const { lang } = await params

  if (!locales.includes(lang as Locale)) notFound()

  const locale = lang as Locale
  const dictionary = await getDictionary(locale)

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${prata.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider delay={300}>
            <LangProvider lang={locale} dictionary={dictionary}>
              {children}
            </LangProvider>
          </TooltipProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
