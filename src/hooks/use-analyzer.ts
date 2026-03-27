"use client";

import { useReducer, useCallback } from "react";
import type { AnalyzeResponse, LinkStatus } from "@/lib/types";

interface AnalyzerState {
  currentUrl: string | null;
  analysisData: AnalyzeResponse | null;
  linkStatuses: Record<string, LinkStatus>;
  isLoading: boolean;
  error: string | null;
}

type AnalyzerAction =
  | { type: "ANALYZE_START"; url: string }
  | { type: "ANALYZE_SUCCESS"; data: AnalyzeResponse }
  | { type: "ANALYZE_ERROR"; error: string }
  | { type: "LINK_STATUSES_UPDATE"; statuses: Record<string, LinkStatus> };

const initialState: AnalyzerState = {
  currentUrl: null,
  analysisData: null,
  linkStatuses: {},
  isLoading: false,
  error: null,
};

function reducer(state: AnalyzerState, action: AnalyzerAction): AnalyzerState {
  switch (action.type) {
    case "ANALYZE_START":
      return {
        ...initialState,
        currentUrl: action.url,
        isLoading: true,
      };
    case "ANALYZE_SUCCESS":
      return {
        ...state,
        analysisData: action.data,
        isLoading: false,
        error: null,
      };
    case "ANALYZE_ERROR":
      return {
        ...state,
        isLoading: false,
        error: action.error,
      };
    case "LINK_STATUSES_UPDATE":
      return {
        ...state,
        linkStatuses: { ...state.linkStatuses, ...action.statuses },
      };
  }
}

interface AnalyzerTranslations {
  failed: string;
  unknownError: string;
}

export function useAnalyzer(translations: AnalyzerTranslations) {
  const [state, dispatch] = useReducer(reducer, initialState);

  const analyzeUrl = useCallback(async (url: string) => {
    dispatch({ type: "ANALYZE_START", url });

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(
          body?.error ?? `${translations.failed} (HTTP ${response.status})`
        );
      }

      const data: AnalyzeResponse = await response.json();
      dispatch({ type: "ANALYZE_SUCCESS", data });
    } catch (err) {
      const message =
        err instanceof Error ? err.message : translations.unknownError;
      dispatch({ type: "ANALYZE_ERROR", error: message });
    }
  }, [translations.failed, translations.unknownError]);

  const updateLinkStatuses = useCallback(
    (statuses: Record<string, LinkStatus>) => {
      dispatch({ type: "LINK_STATUSES_UPDATE", statuses });
    },
    []
  );

  return {
    ...state,
    analyzeUrl,
    updateLinkStatuses,
  };
}
