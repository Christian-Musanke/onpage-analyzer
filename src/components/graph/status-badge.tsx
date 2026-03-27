"use client";

import { STATUS_COLORS } from "@/lib/constants";
import type { LinkStatus } from "@/lib/types";

function getStatusColor(code: number | null): string {
  if (code === null) return STATUS_COLORS.pending;
  if (code >= 200 && code < 300) return STATUS_COLORS.success;
  if (code >= 300 && code < 400) return STATUS_COLORS.redirect;
  if (code >= 400 && code < 500) return STATUS_COLORS.clientError;
  return STATUS_COLORS.serverError;
}

interface StatusBadgeProps {
  status: LinkStatus | null;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  const code = status?.statusCode ?? null;
  const color = getStatusColor(code);
  const label = code !== null ? String(code) : "–";

  return (
    <span
      className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-none text-white ${
        code === null ? "animate-pulse" : ""
      }`}
      style={{ backgroundColor: color }}
    >
      {label}
    </span>
  );
}
