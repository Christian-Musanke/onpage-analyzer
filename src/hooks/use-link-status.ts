"use client";

import { useEffect, useRef } from "react";
import type { LinkData, LinkStatus, CheckLinksResponse } from "@/lib/types";
import { LINK_CHECK_BATCH_SIZE } from "@/lib/constants";

export function useLinkStatus(
  links: LinkData[] | undefined,
  onUpdate: (statuses: Record<string, LinkStatus>) => void
) {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!links || links.length === 0) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const uniqueUrls = [...new Set(links.map((l) => l.href))];

    async function checkBatch(urls: string[]) {
      if (controller.signal.aborted) return;

      try {
        const response = await fetch("/api/check-links", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ urls }),
          signal: controller.signal,
        });

        if (!response.ok) return;

        const data: CheckLinksResponse = await response.json();
        if (!controller.signal.aborted) {
          onUpdate(data.results);
        }
      } catch {
        // Silently ignore aborted or failed batch requests
      }
    }

    async function checkAll() {
      for (let i = 0; i < uniqueUrls.length; i += LINK_CHECK_BATCH_SIZE) {
        if (controller.signal.aborted) break;
        const batch = uniqueUrls.slice(i, i + LINK_CHECK_BATCH_SIZE);
        await checkBatch(batch);
      }
    }

    checkAll();

    return () => {
      controller.abort();
    };
  }, [links, onUpdate]);
}
