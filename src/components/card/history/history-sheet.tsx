"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { ClockIcon } from "lucide-react";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RevisionItem } from "./revision-item";
import {
  type CardSnapshot,
  prepareRevisionsWithDiffs,
  calculateFieldStats,
  CARD_FIELD_LABELS,
  shouldShowStabilityIndicator,
  getStabilityDots,
} from "@/lib/card-history";

type HistoryResponse = {
  revisions: Array<{
    id: string;
    editedAt: string;
    annotation: string;
    snapshot: unknown;
  }>;
  currentCard: CardSnapshot | null;
};

type HistorySheetProps = {
  children?: React.ReactNode;
};

export function HistorySheet({ children }: HistorySheetProps) {
  const { data, isLoading } = useSWR<HistoryResponse>("/api/card/history");

  // Memoize data extraction to avoid reference changes on every render
  const revisions = useMemo(() => data?.revisions ?? [], [data?.revisions]);
  const currentCard = useMemo(() => data?.currentCard ?? null, [data?.currentCard]);

  // Prepare revisions with diffs - memoized to avoid recalculation on every render
  const revisionsWithDiffs = useMemo(
    () => prepareRevisionsWithDiffs(revisions, currentCard),
    [revisions, currentCard]
  );

  // Calculate field stats for the summary
  const stats = useMemo(
    () => calculateFieldStats(revisions, currentCard),
    [revisions, currentCard]
  );

  // Fields with notable volatility (3+ edits)
  const volatileFields = useMemo(() => {
    return (Object.entries(stats) as [keyof typeof stats, number][])
      .filter(([, count]) => shouldShowStabilityIndicator(count))
      .sort((a, b) => b[1] - a[1]);
  }, [stats]);

  return (
    <Sheet>
      <SheetTrigger asChild>
        {children || (
          <Button variant="ghost" size="sm" className="gap-1.5">
            <ClockIcon className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
          </Button>
        )}
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="pb-4">
          <SheetTitle>Card Evolution</SheetTitle>
          <SheetDescription>
            How your future-self card has evolved over time
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : revisionsWithDiffs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <ClockIcon className="h-10 w-10 text-muted-foreground/50" />
            <p className="mt-4 text-sm text-muted-foreground">
              No revisions yet. Changes to your card will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Volatility Summary */}
            {volatileFields.length > 0 && (
              <>
                <div className="rounded-md border bg-muted/30 p-3">
                  <p className="text-xs font-medium uppercase text-muted-foreground">
                    Stability Overview
                  </p>
                  <div className="mt-2 space-y-1.5">
                    {volatileFields.map(([field, count]) => (
                      <div
                        key={field}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{CARD_FIELD_LABELS[field]}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-primary">
                            {getStabilityDots(count)}
                          </span>
                          <Badge variant="outline" className="text-xs">
                            {count} edits
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <Separator className="my-4" />
              </>
            )}

            {/* Timeline Header */}
            <div className="flex items-center justify-between pb-3">
              <p className="text-sm font-medium">
                {revisionsWithDiffs.length} revision
                {revisionsWithDiffs.length !== 1 ? "s" : ""}
              </p>
            </div>

            {/* Timeline */}
            <ScrollArea className="h-[calc(100vh-20rem)] pr-4">
              <div className="space-y-0">
                {revisionsWithDiffs.map((revision, index) => (
                  <RevisionItem
                    key={revision.id}
                    revision={revision}
                    isLatest={index === 0}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
