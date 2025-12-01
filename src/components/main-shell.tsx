"use client";

import { useEffect, useMemo, useState } from "react";

import { CardPanel } from "@/components/card/card-panel";
import { JournalOverview } from "@/components/journal/journal-overview";
import { JournalWorkspace } from "@/components/journal/journal-workspace";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCard } from "@/hooks/use-card";
import { useJournalEntries } from "@/hooks/use-journal";
import type { CardRevision, FutureSelfCard } from "@prisma/client";

import type { CardEditIntent } from "@/types/card-edit-intent";

async function createJournalEntry(): Promise<{ id: string }> {
  const response = await fetch("/api/journal", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: "" }),
  });
  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error("Unable to create entry");
    (error as Record<string, unknown>).info = errorBody;
    throw error;
  }
  const result = await response.json();
  return result.entry;
}

export function MainShell() {
  const { card, isLoading: cardLoading, mutate: mutateCard } = useCard();
  const {
    entries,
    isLoading: entriesLoading,
    mutate: mutateEntries,
  } = useJournalEntries();
  const [activeEntryId, setActiveEntryId] = useState<string | null>(null);
  const [isCreatingEntry, setIsCreatingEntry] = useState(false);
  const [workspaceView, setWorkspaceView] = useState<"entry" | "overview">("entry");
  const [cardEditIntent, setCardEditIntent] = useState<CardEditIntent | null>(null);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);

  useEffect(() => {
    if (!entriesLoading && entries.length === 0 && !isCreatingEntry) {
      setIsCreatingEntry(true);
      createJournalEntry()
        .then((entry) => {
          setActiveEntryId(entry.id);
          mutateEntries();
        })
        .finally(() => setIsCreatingEntry(false));
    }
  }, [entriesLoading, entries.length, isCreatingEntry, mutateEntries]);

  useEffect(() => {
    if (entries.length > 0 && !activeEntryId) {
      setActiveEntryId(entries[0].id);
    }
  }, [entries, activeEntryId]);

  async function handleCreateEntry() {
    if (isCreatingEntry) {
      return;
    }

    setIsCreatingEntry(true);
    try {
      const entry = await createJournalEntry();
      setActiveEntryId(entry.id);
      setWorkspaceView("entry");
      await mutateEntries();
    } catch (error) {
      console.error(error);
    } finally {
      setIsCreatingEntry(false);
    }
  }

  const isLoading = useMemo(
    () => cardLoading || entriesLoading || (entries.length === 0 && isCreatingEntry),
    [cardLoading, entriesLoading, entries.length, isCreatingEntry],
  );

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-10">
      <div className="flex w-full flex-col gap-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-muted-foreground">Future self</p>
            <h1 className="text-3xl font-semibold">Journal workspace</h1>
            <p className="text-sm text-muted-foreground">
              Choose the overview to browse entries or drop straight into writing mode.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" onClick={() => setIsCardModalOpen(true)}>
              Future-self card
            </Button>
            <Tabs
              value={workspaceView}
              onValueChange={(value) => setWorkspaceView(value as "entry" | "overview")}
              className="w-full sm:w-auto"
            >
              <TabsList className="grid w-full grid-cols-2 sm:w-auto">
                <TabsTrigger value="entry">Entry view</TabsTrigger>
                <TabsTrigger value="overview">Overview</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
        {isLoading ? (
          <div className="flex min-h-[480px] items-center justify-center rounded-xl border border-border bg-muted/30">
            <p className="animate-pulse text-sm text-muted-foreground">Preparing your workspace…</p>
          </div>
        ) : workspaceView === "overview" ? (
          <JournalOverview
            entries={entries}
            activeEntryId={activeEntryId}
            onSelectEntry={(id) => {
              setActiveEntryId(id);
              setWorkspaceView("entry");
            }}
            onCreateEntry={handleCreateEntry}
            isCreatingEntry={isCreatingEntry}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,360px)]">
            <div className="col-span-full lg:col-span-1 lg:col-start-1">
              <JournalWorkspace
                entries={entries}
                activeEntryId={activeEntryId}
                onCreateEntry={handleCreateEntry}
                onEntriesUpdated={() => {
                  mutateEntries();
                }}
                isCreatingEntry={isCreatingEntry}
                onRequestCardEdit={setCardEditIntent}
              />
            </div>
            <div className="col-span-full lg:col-span-1 lg:col-start-2">
              <FutureSelfPreview
                card={card}
                isLoading={cardLoading}
                onExpand={() => setIsCardModalOpen(true)}
              />
            </div>
          </div>
        )}
      </div>
      <Dialog
        open={isCardModalOpen || Boolean(cardEditIntent)}
        onOpenChange={(open) => {
          setIsCardModalOpen(open);
          if (!open) {
            setCardEditIntent(null);
          }
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Future-self card</DialogTitle>
          </DialogHeader>
          <CardPanel
            card={card}
            isLoading={cardLoading}
            editIntent={cardEditIntent}
            onEditIntentConsumed={() => setCardEditIntent(null)}
            onCardUpdated={async () => {
              await mutateCard();
              await mutateEntries();
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

type CardPreviewData = (FutureSelfCard & { revisions: CardRevision[] }) | null;

type FutureSelfPreviewProps = {
  card: CardPreviewData;
  isLoading: boolean;
  onExpand: () => void;
};

function FutureSelfPreview({ card, isLoading, onExpand }: FutureSelfPreviewProps) {
  return (
    <Card className="h-full">
      <CardHeader className="space-y-1">
        <CardTitle className="text-lg">Future-self card</CardTitle>
        <CardDescription>
          Preview of the persona grounding your reflections. Expand for the full card.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading card…</p>
        ) : card ? (
          <>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Values</p>
              <p className="mt-1 text-sm font-medium text-foreground">{card.values.join(" · ")}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">6-month focus</p>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-3">{card.sixMonthGoal}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Anti-goals</p>
              <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{card.antiGoals}</p>
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            You haven&apos;t created a Future-self card yet. Expand to start drafting one.
          </p>
        )}
        <Button variant="outline" size="sm" onClick={onExpand}>
          {card ? "Expand card" : "Create card"}
        </Button>
      </CardContent>
    </Card>
  );
}
