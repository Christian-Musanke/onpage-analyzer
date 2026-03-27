"use client"

import { AlertTriangle, Braces, CheckCircle, XCircle } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { useLang } from "@/components/lang-provider"
import type { SchemaItem, SchemaIssue } from "@/lib/types"

interface SchemaDisplayProps {
  schema: SchemaItem[]
}

export function SchemaDisplay({ schema }: SchemaDisplayProps) {
  const { t } = useLang()

  if (schema.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        {t.schemaDisplay.noSchema}
      </p>
    )
  }

  const totalErrors = schema.reduce(
    (sum, item) => sum + item.issues.filter((i) => i.severity === "error").length,
    0,
  )
  const totalWarnings = schema.reduce(
    (sum, item) => sum + item.issues.filter((i) => i.severity === "warning").length,
    0,
  )

  return (
    <div className="space-y-2">
      {/* Validation summary */}
      <div className="flex items-center gap-2 text-xs">
        {totalErrors === 0 && totalWarnings === 0 ? (
          <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
            <CheckCircle className="size-3.5" />
            {t.schemaDisplay.valid}
          </span>
        ) : (
          <>
            {totalErrors > 0 && (
              <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                <XCircle className="size-3.5" />
                {totalErrors} {totalErrors === 1 ? t.schemaDisplay.error : t.schemaDisplay.errors}
              </span>
            )}
            {totalWarnings > 0 && (
              <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="size-3.5" />
                {totalWarnings} {totalWarnings === 1 ? t.schemaDisplay.warning : t.schemaDisplay.warnings}
              </span>
            )}
          </>
        )}
      </div>

      <Accordion>
        {schema.map((item, i) => {
          const errors = item.issues.filter((is) => is.severity === "error")
          const warnings = item.issues.filter((is) => is.severity === "warning")

          return (
            <AccordionItem key={i} value={`schema-${i}`}>
              <AccordionTrigger>
                <span className="inline-flex items-center gap-1.5">
                  <Braces className="size-4" />
                  {item.type}
                  {errors.length > 0 && (
                    <Badge variant="destructive" className="ml-1 px-1.5 py-0 text-[10px]">
                      {errors.length}
                    </Badge>
                  )}
                  {warnings.length > 0 && (
                    <Badge className="ml-0.5 bg-amber-500/15 px-1.5 py-0 text-[10px] text-amber-700 dark:text-amber-400 hover:bg-amber-500/15">
                      {warnings.length}
                    </Badge>
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-2">
                  {/* Validation issues */}
                  {item.issues.length > 0 && (
                    <div className="space-y-1 rounded-md border px-2.5 py-2">
                      {item.issues.map((issue, j) => (
                        <SchemaIssueRow key={j} issue={issue} />
                      ))}
                    </div>
                  )}

                  {/* Raw JSON */}
                  <pre className="overflow-x-auto rounded-md bg-muted p-2.5 text-xs font-mono leading-relaxed">
                    {JSON.stringify(item.raw, null, 2)}
                  </pre>
                </div>
              </AccordionContent>
            </AccordionItem>
          )
        })}
      </Accordion>
    </div>
  )
}

function SchemaIssueRow({ issue }: { issue: SchemaIssue }) {
  const isError = issue.severity === "error"

  return (
    <div
      className={cn(
        "flex items-start gap-1.5 text-xs",
        isError
          ? "text-red-700 dark:text-red-400"
          : "text-amber-700 dark:text-amber-400",
      )}
    >
      {isError ? (
        <XCircle className="mt-0.5 size-3 shrink-0" />
      ) : (
        <AlertTriangle className="mt-0.5 size-3 shrink-0" />
      )}
      <span>
        {issue.message}
        {issue.path && (
          <code className="ml-1 rounded bg-muted px-1 py-0.5 text-[10px] text-muted-foreground">
            {issue.path}
          </code>
        )}
      </span>
    </div>
  )
}
