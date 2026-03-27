"use client"

import { Badge } from "@/components/ui/badge"
import type { RobotsData } from "@/lib/types"

interface RobotsInfoProps {
  robots: RobotsData
}

export function RobotsInfo({ robots }: RobotsInfoProps) {
  return (
    <div className="flex items-center gap-2">
      <Badge
        variant={robots.isNoindex ? "destructive" : "secondary"}
        className="text-xs"
      >
        {robots.isNoindex ? "noindex" : "index"}
      </Badge>
      <Badge
        variant={robots.isNofollow ? "destructive" : "secondary"}
        className="text-xs"
      >
        {robots.isNofollow ? "nofollow" : "follow"}
      </Badge>
    </div>
  )
}
