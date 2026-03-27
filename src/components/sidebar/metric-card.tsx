"use client"

import type { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "@/lib/utils"

interface MetricCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon: ReactNode
  onClick?: () => void
}

export function MetricCard({
  title,
  value,
  subtitle,
  icon,
  onClick,
}: MetricCardProps) {
  return (
    <Card
      size="sm"
      className={cn(
        "transition-colors",
        onClick && "cursor-pointer hover:bg-muted/40"
      )}
      onClick={onClick}
    >
      <CardContent className="flex items-center gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{title}</p>
          <p className="text-sm font-semibold leading-tight">{value}</p>
          {subtitle && (
            <p className="text-[11px] text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
