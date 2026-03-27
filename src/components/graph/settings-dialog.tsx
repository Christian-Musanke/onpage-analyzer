"use client";

import { Settings } from "lucide-react";
import type { GraphSettings } from "@/lib/graph-settings";
import { DEFAULT_GRAPH_SETTINGS } from "@/lib/graph-settings";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useLang } from "@/components/lang-provider";

interface SettingsDialogProps {
  settings: GraphSettings;
  onChange: (next: Partial<GraphSettings>) => void;
}

export function SettingsDialog({ settings, onChange }: SettingsDialogProps) {
  const { t } = useLang();

  return (
    <Dialog>
      <Tooltip>
        <TooltipTrigger
          render={
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8 bg-card shadow-sm"
                />
              }
            />
          }
        >
          <Settings className="size-4" />
        </TooltipTrigger>
        <TooltipContent side="right">{t.settingsDialog.tooltip}</TooltipContent>
      </Tooltip>

      <DialogContent maxWidth="24rem">
        <DialogHeader>
          <DialogTitle>{t.settingsDialog.title}</DialogTitle>
          <DialogDescription>
            {t.settingsDialog.description}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5 pt-1">
          {/* ── Collapse chains toggle ────────────────────────── */}
          <label className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t.settingsDialog.collapseChains}</p>
              <p className="text-xs text-muted-foreground">
                {t.settingsDialog.collapseChainsDesc}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.collapseChains}
              onChange={(e) => onChange({ collapseChains: e.target.checked })}
              className="size-4 accent-primary"
            />
          </label>

          {/* ── Only headline links toggle ──────────────────────── */}
          <label className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">{t.settingsDialog.onlyHeadlineLinks}</p>
              <p className="text-xs text-muted-foreground">
                {t.settingsDialog.onlyHeadlineLinksDesc}
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.onlyHeadlineLinks}
              onChange={(e) => onChange({ onlyHeadlineLinks: e.target.checked })}
              className="size-4 accent-primary"
            />
          </label>

          {/* ── Font scale slider ─────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t.settingsDialog.fontSize}</p>
              <span className="text-xs tabular-nums text-muted-foreground">
                {Math.round(settings.fontScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={2}
              step={0.1}
              value={settings.fontScale}
              onChange={(e) =>
                onChange({ fontScale: parseFloat(e.target.value) })
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>50%</span>
              <span>200%</span>
            </div>
          </div>

          {/* ── Node gap slider ───────────────────────────────── */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium">{t.settingsDialog.nodeGap}</p>
              <span className="text-xs tabular-nums text-muted-foreground">
                {settings.nodeGap}px
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              step={5}
              value={settings.nodeGap}
              onChange={(e) =>
                onChange({ nodeGap: parseInt(e.target.value, 10) })
              }
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>0px</span>
              <span>60px</span>
            </div>
          </div>

          {/* ── Reset button ──────────────────────────────────── */}
          <Button
            variant="outline"
            size="sm"
            className="self-end"
            onClick={() => onChange(DEFAULT_GRAPH_SETTINGS)}
          >
            {t.settingsDialog.reset}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
