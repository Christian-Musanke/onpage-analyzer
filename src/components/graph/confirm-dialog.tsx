"use client";

import {
  ExternalLink,
  FileText,
  Heading,
  Loader2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useUrlPreview } from "@/hooks/use-url-preview";
import type { LinkData, LinkStatus } from "@/lib/types";

interface ConfirmDialogProps {
  open: boolean;
  link: LinkData | null;
  status: LinkStatus | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const HEADING_INDENT: Record<number, string> = {
  1: "pl-0",
  2: "pl-3",
  3: "pl-6",
  4: "pl-9",
  5: "pl-12",
  6: "pl-14",
};

export function ConfirmDialog({
  open,
  link,
  status,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const url = link?.href ?? "";
  const { preview, isLoading } = useUrlPreview(open ? url : "");

  return (
    <AlertDialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <AlertDialogContent className="!max-w-lg sm:!max-w-xl">
        <AlertDialogHeader className="!text-left !place-items-start">
          <AlertDialogTitle>Neue URL analysieren?</AlertDialogTitle>
        </AlertDialogHeader>

        {/* URL */}
        <div className="rounded-md bg-muted px-3 py-2">
          <div className="flex items-start gap-2">
            <ExternalLink className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
            <p className="break-all font-mono text-xs text-foreground">
              {url}
            </p>
          </div>
          {link && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <Badge variant={link.isInternal ? "default" : "secondary"} className="text-[10px]">
                {link.isInternal ? "Intern" : "Extern"}
              </Badge>
              {status?.statusCode && (
                <Badge variant="outline" className="text-[10px]">
                  HTTP {status.statusCode}
                </Badge>
              )}
              {link.rel.nofollow && (
                <Badge variant="outline" className="text-[10px] text-destructive">nofollow</Badge>
              )}
              {link.rel.sponsored && (
                <Badge variant="outline" className="text-[10px]">sponsored</Badge>
              )}
              {link.rel.ugc && (
                <Badge variant="outline" className="text-[10px]">ugc</Badge>
              )}
              {link.text && (
                <span className="text-[10px] text-muted-foreground">
                  Ankertext: &quot;{link.text}&quot;
                </span>
              )}
            </div>
          )}
        </div>

        {/* Preview section */}
        {open && (
          <>
            <Separator />
            <div className="space-y-3 max-h-[340px] overflow-y-auto">
              {/* Title */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                  <FileText className="size-3" />
                  Titel
                </div>
                {isLoading ? (
                  <Skeleton className="h-4 w-3/4" />
                ) : preview?.title ? (
                  <p className="text-sm break-words">{preview.title}</p>
                ) : (
                  <p className="text-xs italic text-muted-foreground">Nicht verfügbar</p>
                )}
              </div>

              {/* Meta Description */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                  <FileText className="size-3" />
                  Meta Description
                </div>
                {isLoading ? (
                  <div className="space-y-1.5">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-2/3" />
                  </div>
                ) : preview?.metaDescription ? (
                  <p className="text-xs text-muted-foreground break-words leading-relaxed">
                    {preview.metaDescription}
                  </p>
                ) : (
                  <p className="text-xs italic text-muted-foreground">Nicht verfügbar</p>
                )}
              </div>

              {/* Headings */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1">
                  <Heading className="size-3" />
                  Überschriften-Struktur
                </div>
                {isLoading ? (
                  <div className="space-y-1.5">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <Skeleton key={i} className="h-3" style={{ width: `${70 - i * 10}%` }} />
                    ))}
                  </div>
                ) : preview?.headings && preview.headings.length > 0 ? (
                  <div className="space-y-0.5">
                    {preview.headings.slice(0, 20).map((h, i) => (
                      <div
                        key={i}
                        className={`flex items-baseline gap-1.5 ${HEADING_INDENT[h.level] ?? "pl-14"}`}
                      >
                        <span className="shrink-0 rounded bg-muted px-1 py-px text-[9px] font-semibold text-muted-foreground">
                          H{h.level}
                        </span>
                        <span className="text-xs break-words min-w-0">
                          {h.text}
                        </span>
                      </div>
                    ))}
                    {preview.headings.length > 20 && (
                      <p className="text-[10px] text-muted-foreground pl-3 pt-1">
                        +{preview.headings.length - 20} weitere Überschriften
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs italic text-muted-foreground">
                    {isLoading ? "" : "Keine Überschriften gefunden"}
                  </p>
                )}
              </div>

              {/* Loading indicator */}
              {isLoading && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="size-3 animate-spin" />
                  Lade Vorschau…
                </div>
              )}
            </div>
          </>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Abbrechen</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>
            Analysieren
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
