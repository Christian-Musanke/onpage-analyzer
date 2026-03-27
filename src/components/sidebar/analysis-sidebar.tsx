"use client"

import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { PrimaryInfo } from "./primary-info"
import { RobotsInfo } from "./robots-info"
import { HeadingTree } from "./heading-tree"
import { MediaAccordion } from "./media-accordion"
import { SchemaDisplay } from "./schema-display"
import { SecondaryMetrics } from "./secondary-metrics"
import { useLang } from "@/components/lang-provider"
import type { SeoData, PageMetrics, LinkData, LinkStatus, HeadingNode } from "@/lib/types"

interface AnalysisSidebarProps {
  seo: SeoData
  metrics: PageMetrics
  links: LinkData[]
  linkStatuses: Record<string, LinkStatus>
  focusedSection: HeadingNode | null
  onFocusSection: (node: HeadingNode) => void
}

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-heading text-sm font-semibold tracking-tight">
      {children}
    </h3>
  )
}

export function AnalysisSidebar({
  seo,
  metrics,
  links,
  linkStatuses,
  focusedSection,
  onFocusSection,
}: AnalysisSidebarProps) {
  const { t } = useLang()

  return (
    <ScrollArea className="h-full">
      <div className="space-y-5 p-4">
        {/* Primary SEO Info */}
        <section className="space-y-2">
          <SectionHeader>{t.sidebar.seoBasics}</SectionHeader>
          <PrimaryInfo seo={seo} />
        </section>

        <Separator />

        {/* Robots */}
        <section className="space-y-2">
          <SectionHeader>{t.sidebar.robots}</SectionHeader>
          <RobotsInfo robots={seo.robots} />
        </section>

        <Separator />

        {/* Heading Structure */}
        <section className="space-y-2">
          <SectionHeader>{t.sidebar.headingStructure}</SectionHeader>
          <HeadingTree
            headings={seo.headings}
            focusedSection={focusedSection}
            onFocusSection={onFocusSection}
          />
        </section>

        <Separator />

        {/* Media */}
        <section className="space-y-2">
          <SectionHeader>{t.sidebar.media}</SectionHeader>
          <MediaAccordion media={seo.media} />
        </section>

        <Separator />

        {/* Schema */}
        <section className="space-y-2">
          <SectionHeader>{t.sidebar.structuredData}</SectionHeader>
          <SchemaDisplay schema={seo.schema} />
        </section>

        <Separator />

        {/* Metrics */}
        <section className="space-y-2">
          <SectionHeader>{t.sidebar.metrics}</SectionHeader>
          <SecondaryMetrics
            metrics={metrics}
            links={links}
            images={seo.media.images}
            headings={seo.headings}
            linkStatuses={linkStatuses}
          />
        </section>
      </div>
    </ScrollArea>
  )
}
