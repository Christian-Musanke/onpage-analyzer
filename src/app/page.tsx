"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Globe, ArrowRight } from "lucide-react";
import { SearchBar } from "@/components/layout/search-bar";
import { AnalysisSidebar } from "@/components/sidebar/analysis-sidebar";
import { useAnalyzer } from "@/hooks/use-analyzer";
import { useLinkStatus } from "@/hooks/use-link-status";
import {
  HoveredLinkProvider,
  filterLinksForSection,
} from "@/hooks/use-hovered-link";
import { Skeleton } from "@/components/ui/skeleton";
import type { HeadingNode } from "@/lib/types";

const AnalyzerGraph = dynamic(
  () =>
    import("@/components/graph/analyzer-graph").then(
      (mod) => mod.AnalyzerGraph
    ),
  {
    ssr: false,
    loading: () => <GraphSkeleton />,
  }
);

function GraphSkeleton() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Skeleton className="h-16 w-48 rounded-lg" />
        <div className="flex gap-8">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-32 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-muted-foreground">
      <Globe className="h-16 w-16 opacity-30" />
      <div className="text-center">
        <p className="text-lg font-medium">Keine URL analysiert</p>
        <p className="mt-1 flex items-center gap-1 text-sm">
          URL oben eingeben und <ArrowRight className="h-3 w-3 inline" />{" "}
          <span className="font-medium text-foreground">Analysieren</span>{" "}
          klicken
        </p>
      </div>
    </div>
  );
}

function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="mx-4 mt-3 rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <p className="font-medium">Fehler bei der Analyse</p>
      <p className="mt-1">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 text-xs underline hover:no-underline"
        >
          Erneut versuchen
        </button>
      )}
    </div>
  );
}

export default function HomePage() {
  const {
    currentUrl,
    analysisData,
    linkStatuses,
    isLoading,
    error,
    analyzeUrl,
    updateLinkStatuses,
  } = useAnalyzer();

  useLinkStatus(analysisData?.links, updateLinkStatuses);

  // ── Section focus ──────────────────────────────────────────────────

  const [focusedSection, setFocusedSection] = useState<HeadingNode | null>(
    null,
  );

  // Clear focus when analysis data changes (new URL / navigation).
  const prevAnalysisRef = useRef(analysisData);
  if (prevAnalysisRef.current !== analysisData) {
    prevAnalysisRef.current = analysisData;
    if (focusedSection !== null) setFocusedSection(null);
  }

  const filteredLinks = useMemo(() => {
    if (!analysisData) return [];
    if (!focusedSection) return analysisData.links;
    return filterLinksForSection(analysisData.links, focusedSection);
  }, [analysisData, focusedSection]);

  const handleFocusSection = useCallback((node: HeadingNode) => {
    setFocusedSection((prev) => (prev === node ? null : node));
  }, []);

  const handleClearFocus = useCallback(() => {
    setFocusedSection(null);
  }, []);

  const hasData = analysisData !== null;

  return (
    <div className="flex h-screen flex-col">
      <SearchBar
        onSubmit={analyzeUrl}
        isLoading={isLoading}
        currentUrl={currentUrl}
      />

      {error && (
        <ErrorBanner
          message={error}
          onRetry={currentUrl ? () => analyzeUrl(currentUrl) : undefined}
        />
      )}

      <HoveredLinkProvider>
        <div className="flex flex-1 overflow-hidden">
          {/* Main Canvas - 2/3 */}
          <main className="flex-1 min-w-0 lg:flex-[2]">
            {hasData ? (
              <AnalyzerGraph
                links={filteredLinks}
                linkStatuses={linkStatuses}
                currentUrl={analysisData.url}
                currentStatus={analysisData.status}
                onNavigate={analyzeUrl}
                focusedSectionLabel={
                  focusedSection
                    ? `H${focusedSection.level} ${focusedSection.text}`
                    : null
                }
                onClearFocus={handleClearFocus}
              />
            ) : isLoading ? (
              <GraphSkeleton />
            ) : (
              <EmptyState />
            )}
          </main>

          {/* Sidebar - 1/3 */}
          {hasData && (
            <aside className="w-full border-l lg:w-[480px] lg:max-w-[38%]">
              <AnalysisSidebar
                seo={analysisData.seo}
                metrics={analysisData.metrics}
                links={analysisData.links}
                linkStatuses={linkStatuses}
                focusedSection={focusedSection}
                onFocusSection={handleFocusSection}
              />
            </aside>
          )}
        </div>
      </HoveredLinkProvider>
    </div>
  );
}
