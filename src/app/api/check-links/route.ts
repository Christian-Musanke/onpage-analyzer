import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  HEAD_REQUEST_TIMEOUT_MS,
  LINK_CHECK_BATCH_SIZE,
  USER_AGENT,
} from "@/lib/constants";
import type { CheckLinksResponse, LinkStatus } from "@/lib/types";

export const maxDuration = 30;

const requestSchema = z.object({
  urls: z
    .array(z.string().url())
    .min(1, "At least one URL is required")
    .max(LINK_CHECK_BATCH_SIZE, `Maximum ${LINK_CHECK_BATCH_SIZE} URLs allowed`),
});

const REDIRECT_CODES = new Set([301, 302, 307, 308]);

async function checkSingleLink(url: string): Promise<LinkStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEAD_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });

    clearTimeout(timeout);

    // If HEAD returns 405 Method Not Allowed, fall back to GET
    if (response.status === 405) {
      return await checkWithGet(url);
    }

    const result: LinkStatus = { statusCode: response.status };

    if (REDIRECT_CODES.has(response.status)) {
      const location = response.headers.get("location");
      if (location) {
        result.redirectUrl = location;
      }
    }

    return result;
  } catch (err: unknown) {
    clearTimeout(timeout);

    // If aborted (timeout), also try to distinguish from 405 fallback not needed
    if (err instanceof DOMException && err.name === "AbortError") {
      return { statusCode: null, error: "Request timed out" };
    }

    return {
      statusCode: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

async function checkWithGet(url: string): Promise<LinkStatus> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), HEAD_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "manual",
      signal: controller.signal,
      headers: { "User-Agent": USER_AGENT },
    });

    // Abort immediately after receiving headers to avoid downloading the body
    controller.abort();
    clearTimeout(timeout);

    const result: LinkStatus = { statusCode: response.status };

    if (REDIRECT_CODES.has(response.status)) {
      const location = response.headers.get("location");
      if (location) {
        result.redirectUrl = location;
      }
    }

    return result;
  } catch (err: unknown) {
    clearTimeout(timeout);

    // AbortError is expected here since we abort after getting headers
    if (err instanceof DOMException && err.name === "AbortError") {
      return { statusCode: null, error: "Request timed out" };
    }

    return {
      statusCode: null,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

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

  const { urls } = parsed.data;

  const settled = await Promise.allSettled(
    urls.map((url) => checkSingleLink(url)),
  );

  const results: Record<string, LinkStatus> = {};

  for (let i = 0; i < urls.length; i++) {
    const outcome = settled[i];
    if (outcome.status === "fulfilled") {
      results[urls[i]] = outcome.value;
    } else {
      results[urls[i]] = {
        statusCode: null,
        error: outcome.reason instanceof Error
          ? outcome.reason.message
          : "Unknown error",
      };
    }
  }

  const response: CheckLinksResponse = { results };
  return NextResponse.json(response, { status: 200 });
}
