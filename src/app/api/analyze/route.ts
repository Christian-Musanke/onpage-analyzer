import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { parseHtml } from "@/lib/parsers/html-parser";
import { FETCH_TIMEOUT_MS, USER_AGENT } from "@/lib/constants";
import type { AnalyzeResponse } from "@/lib/types";

export const maxDuration = 30;

const requestSchema = z.object({
  url: z.string().url().refine(
    (u) => u.startsWith("http://") || u.startsWith("https://"),
    { message: "URL must use http or https protocol" },
  ),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }

  const { url } = parsed.data;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const start = performance.now();

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });

    const html = await response.text();
    const loadTimeMs = Math.round(performance.now() - start);

    clearTimeout(timeout);

    const xRobotsTag = response.headers.get("x-robots-tag");
    const { seo, links, metrics } = parseHtml(html, url, xRobotsTag, loadTimeMs);
    const pageSizeBytes = Buffer.byteLength(html);

    const result: AnalyzeResponse = {
      url,
      fetchedAt: new Date().toISOString(),
      status: response.status,
      loadTimeMs,
      pageSizeBytes,
      seo,
      links,
      metrics,
    };

    return NextResponse.json(result, { status: 200 });
  } catch (err: unknown) {
    clearTimeout(timeout);

    if (err instanceof DOMException && err.name === "AbortError") {
      return NextResponse.json(
        { error: `Request timed out after ${FETCH_TIMEOUT_MS}ms` },
        { status: 504 },
      );
    }

    const message =
      err instanceof Error ? err.message : "Failed to fetch the URL";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
