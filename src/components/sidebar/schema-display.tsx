"use client"

import { Braces } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import type { SchemaItem } from "@/lib/types"

interface SchemaDisplayProps {
  schema: SchemaItem[]
}

export function SchemaDisplay({ schema }: SchemaDisplayProps) {
  if (schema.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">
        Kein strukturiertes Schema gefunden
      </p>
    )
  }

  return (
    <Accordion>
      {schema.map((item, i) => (
        <AccordionItem key={i} value={`schema-${i}`}>
          <AccordionTrigger>
            <span className="inline-flex items-center gap-1.5">
              <Braces className="size-4" />
              {item.type}
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <pre className="overflow-x-auto rounded-md bg-muted p-2.5 text-xs font-mono leading-relaxed">
              {JSON.stringify(item.raw, null, 2)}
            </pre>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  )
}
