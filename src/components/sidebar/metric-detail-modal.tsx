"use client"

import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useLang } from "@/components/lang-provider"

interface MetricDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  maxWidth?: string
  children: ReactNode
}

export function MetricDetailModal({
  open,
  onOpenChange,
  title,
  maxWidth = "28rem",
  children,
}: MetricDetailModalProps) {
  const { t } = useLang()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent maxWidth={maxWidth}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription className="sr-only">
            {t.metricDetailModal.detailsAbout} {title}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
