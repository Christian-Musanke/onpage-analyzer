"use client";

import { useEffect, useRef, useState } from "react";
import type { AnalyzeResponse } from "@/lib/types";

interface UrlPreview {
  title: string | null;
  metaDescription: string | null;
  headings: { level: number; text: string }[];
}

interface UseUrlPreviewResult {
  preview: UrlPreview | null;
  isLoading: boolean;
}

function flattenHeadings(
  nodes: { level: number; text: string; children: unknown[] }[],
): { level: number; text: string }[] {
  const result: { level: number; text: string }[] = [];
  for (const node of nodes) {
    result.push({ level: node.level, text: node.text });
    if (Array.isArray(node.children) && node.children.length > 0) {
      result.push(
        ...flattenHeadings(
          node.children as { level: number; text: string; children: unknown[] }[],
        ),
      );
    }
  }
  return result;
}

/**
 * Fetches a lightweight preview (title, description, headings) of a URL
 * by calling the existing /api/analyze endpoint.
 * Only fetches when `url` is non-empty. Aborts on unmount or URL change.
 */
export function useUrlPreview(url: string): UseUrlPreviewResult {
  const [preview, setPreview] = useState<UrlPreview | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!url) {
      setPreview(null);
      setIsLoading(false);
      return;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    setPreview(null);

    fetch("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    })
      .then((res) => {
        if (!res.ok) throw new Error("fetch failed");
        return res.json();
      })
      .then((data: AnalyzeResponse) => {
        if (controller.signal.aborted) return;
        setPreview({
          title: data.seo.title,
          metaDescription: data.seo.metaDescription,
          headings: flattenHeadings(data.seo.headings),
        });
      })
      .catch(() => {
        // Silently ignore — preview is optional
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => {
      controller.abort();
    };
  }, [url]);

  return { preview, isLoading };
}
