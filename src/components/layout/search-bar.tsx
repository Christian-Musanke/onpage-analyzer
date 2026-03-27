"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { LangToggle } from "./lang-toggle";
import { useLang } from "@/components/lang-provider";

interface SearchBarProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
  currentUrl: string | null;
}

export function SearchBar({ onSubmit, isLoading, currentUrl }: SearchBarProps) {
  const { t } = useLang();
  const [value, setValue] = useState(currentUrl ?? "");

  // Sync local input with external URL changes (e.g. sub-node navigation)
  useEffect(() => {
    if (currentUrl) {
      setValue(currentUrl);
    }
  }, [currentUrl]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) return;

    let url = trimmed;
    if (!/^https?:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    setValue(url);
    onSubmit(url);
  }

  return (
    <header className="flex items-center gap-3 border-b px-4 py-3">
      <h1 className="font-heading text-lg font-medium shrink-0 hidden sm:block">
        {t.searchBar.title}
      </h1>
      <form onSubmit={handleSubmit} className="flex flex-1 items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="url"
            placeholder={t.searchBar.placeholder}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="pl-9"
            disabled={isLoading}
          />
        </div>
        <Button type="submit" disabled={isLoading || !value.trim()} size="sm">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            t.searchBar.analyze
          )}
        </Button>
      </form>
      <LangToggle />
      <ThemeToggle />
    </header>
  );
}
