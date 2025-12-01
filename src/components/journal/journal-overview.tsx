"use client";

import { format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type JournalOverviewEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  preview: string;
};

type JournalOverviewProps = {
  entries: JournalOverviewEntry[];
  activeEntryId: string | null;
  onSelectEntry: (id: string) => void;
  onCreateEntry: () => Promise<void>;
  isCreatingEntry: boolean;
};

export function JournalOverview({
  entries,
  activeEntryId,
  onSelectEntry,
  onCreateEntry,
  isCreatingEntry,
}: JournalOverviewProps) {
  return (
    <Card className="min-h-[480px]">
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle className="text-lg">Journal overview</CardTitle>
          <CardDescription>Browse everything you&apos;ve captured so far.</CardDescription>
        </div>
        <Button size="sm" onClick={onCreateEntry} disabled={isCreatingEntry}>
          {isCreatingEntry ? "Creating…" : "Start new entry"}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)] w-full">
          <div className="space-y-3 px-6 pb-6 pt-2">
            {entries.length === 0 ? (
              <CardDescription className="px-2 py-6 text-center">
                New entries will appear here. Start one to see it listed.
              </CardDescription>
            ) : (
              entries.map((entry) => {
                const isActive = entry.id === activeEntryId;
                return (
                  <button
                    key={entry.id}
                    type="button"
                    onClick={() => onSelectEntry(entry.id)}
                    className={`w-full rounded-lg border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-primary bg-primary/5 text-foreground"
                        : "border-border hover:border-primary/60 hover:bg-muted"
                    }`}
                  >
                    <p className="text-sm font-medium">
                      {format(new Date(entry.createdAt), "MMM d, yyyy")}
                    </p>
                    <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">
                      {entry.preview || "Untitled entry"}
                    </p>
                  </button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
