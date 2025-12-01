"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import useSWRMutation from "swr/mutation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useJournalEntry } from "@/hooks/use-journal";
import { usePrompt } from "@/hooks/use-prompt";
import { cn } from "@/lib/utils";
import type { CardEditIntent } from "@/types/card-edit-intent";

type JournalListEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  preview: string;
};

type NotesMutationArgs = {
  entryId: string;
  content: string;
};

type Note = {
  id: string;
  category: string;
  summary: string;
  body: string;
  provenance?: Record<string, unknown>;
  supportsCardEdit?: {
    field: string;
    suggestion: string;
    severity?: string;
    refinedJustification?: string | null;
  } | null;
  generatedAt: string;
};

type InlineQuestion = {
  id: string;
  text: string;
  anchorSentence?: string | null;
  cardElement?: string | null;
  createdAt: string;
};

async function updateEntry(id: string, body: Record<string, unknown>) {
  const response = await fetch(`/api/journal/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error("Failed to save entry");
    (error as Record<string, unknown>).info = errorBody;
    throw error;
  }

  return response.json();
}

async function requestMarginNotes(_url: string, { arg }: { arg: NotesMutationArgs }) {
  const response = await fetch("/api/margin-notes", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(arg),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error("Unable to generate notes");
    (error as Record<string, unknown>).info = errorBody;
    throw error;
  }

  return response.json() as Promise<{ notes: Note[]; inlineQuestions: InlineQuestion[] }>;
}

type JournalWorkspaceProps = {
  entries: JournalListEntry[];
  activeEntryId: string | null;
  onCreateEntry: () => Promise<void>;
  onEntriesUpdated: () => void;
  isCreatingEntry: boolean;
  onRequestCardEdit: (intent: CardEditIntent) => void;
};

export function JournalWorkspace({
  entries,
  activeEntryId,
  onCreateEntry,
  onEntriesUpdated,
  isCreatingEntry,
  onRequestCardEdit,
}: JournalWorkspaceProps) {
  const { entry, mutate, isLoading } = useJournalEntry(activeEntryId ?? undefined);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Note[]>([]);
  const [inlineQuestions, setInlineQuestions] = useState<InlineQuestion[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isPromptInserting, setIsPromptInserting] = useState(false);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const notesMutation = useSWRMutation("/api/margin-notes", requestMarginNotes);
  const promptMutation = usePrompt();

  const currentEntryId = entry?.id ?? "";
  const editableContent =
    entry && currentEntryId ? drafts[currentEntryId] ?? entry.content : entry?.content ?? "";

  useEffect(() => {
    if (!entry) {
      setNotes([]);
      setInlineQuestions([]);
      return;
    }
    const initialNotes =
      entry.marginNotes?.map((note) => ({
        id: note.id,
        category: note.category,
        summary: note.summary,
        body: note.body,
        provenance: note.provenance,
        supportsCardEdit: note.supportsCardEdit as Note["supportsCardEdit"],
        generatedAt: note.generatedAt,
      })) ?? [];
    const initialQuestions =
      entry.reflectionQuestions?.map((question) => ({
        id: question.id,
        text: question.text,
        anchorSentence: question.anchorSentence,
        cardElement: question.cardElement,
        createdAt: question.createdAt,
      })) ?? [];

    setNotes(initialNotes);
    setInlineQuestions(initialQuestions);
  }, [entry]);

  useEffect(() => {
    return () => {
      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }
    };
  }, []);

  useEffect(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
  }, [currentEntryId]);

  const formattedDate = useMemo(() => {
    if (!entry?.createdAt) return null;
    return format(new Date(entry.createdAt), "MMM d, yyyy • h:mm a");
  }, [entry?.createdAt]);

  const statusLabel = useMemo(() => {
    switch (saveStatus) {
      case "saving":
        return "Saving…";
      case "saved":
        return "Saved";
      case "error":
        return "Couldn't save";
      default:
        return "Idle";
    }
  }, [saveStatus]);

  function scheduleSave(entryId: string, nextContent: string) {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
    }

    setSaveStatus("saving");
    setStatusMessage(null);

    saveTimer.current = setTimeout(async () => {
      try {
        await updateEntry(entryId, { content: nextContent });
        setSaveStatus("saved");
        setStatusMessage("Saved");
        mutate();
        onEntriesUpdated();
      } catch (error) {
        setSaveStatus("error");
        setStatusMessage((error as Error).message);
      } finally {
        saveTimer.current = null;
      }
    }, 1200);
  }

  function handleContentChange(value: string) {
    if (!entry) return;

    setDrafts((prev) => ({
      ...prev,
      [entry.id]: value,
    }));

    scheduleSave(entry.id, value);
  }

  async function handleGenerateNotes() {
    if (!entry || isGeneratingInsights) {
      return;
    }

    try {
      setIsGeneratingInsights(true);
      const result = await notesMutation.trigger({
        entryId: entry.id,
        content: editableContent,
      });
      setNotes(result.notes);
      setInlineQuestions(result.inlineQuestions);
      setStatusMessage("Reflection refreshed.");
      mutate();
    } catch (error) {
      setStatusMessage((error as Error).message);
    } finally {
      setIsGeneratingInsights(false);
    }
  }

  async function handleInsertPrompt() {
    if (!entry || isPromptInserting) {
      return;
    }

    setIsPromptInserting(true);
    try {
      const result = await promptMutation.trigger();
      const promptText = result?.prompt?.text;
      if (!promptText) {
        return;
      }

      const currentContent = editableContent ?? "";
      const sanitizedCurrent = currentContent.trimStart();
      const alreadyInserted = sanitizedCurrent.startsWith(promptText);
      if (alreadyInserted) {
        setStatusMessage("Prompt already at the top of this entry.");
        return;
      }

      const nextContent = `${promptText}\n\n${currentContent}`;
      setDrafts((prev) => ({
        ...prev,
        [entry.id]: nextContent,
      }));
      scheduleSave(entry.id, nextContent);
      setStatusMessage("Prompt added to the beginning of your entry.");
    } catch (error) {
      setSaveStatus("error");
      setStatusMessage((error as Error).message);
    } finally {
      setIsPromptInserting(false);
    }
  }

  const activeEntryPreview = entries.find((item) => item.id === activeEntryId);
  const previewNotes = notes.slice(0, 3);

  function handleCardEditRequest(note: Note) {
    if (!note.supportsCardEdit) return;
    onRequestCardEdit({
      field: note.supportsCardEdit.field,
      suggestion: note.supportsCardEdit.suggestion,
      severity: note.supportsCardEdit.severity,
      summary: note.summary,
      body: note.body,
      modalCopy: note.supportsCardEdit.refinedJustification ?? undefined,
    });
  }

  function renderProvenance(provenance?: Record<string, unknown>) {
    if (!provenance) return null;
    const keyword = typeof provenance.keyword === "string" ? provenance.keyword : null;
    const count = typeof provenance.count === "number" ? provenance.count : null;
    const dates = Array.isArray(provenance.historicalDates)
      ? (provenance.historicalDates as string[])
      : null;

    if (!keyword && !count && !dates) {
      return null;
    }

    return (
      <div className="rounded-md bg-muted/40 p-3 text-xs text-muted-foreground">
        {keyword ? (
          <p>
            Keyword: <span className="font-semibold text-foreground">{keyword}</span>
          </p>
        ) : null}
        {count ? <p>Mentions in window: {count}</p> : null}
        {dates?.length ? <p>Dates: {dates.join(", ")}</p> : null}
      </div>
    );
  }

  function formatCategory(category: string) {
    switch (category) {
      case "CARD_TENSION":
        return "Card tension";
      case "TEMPORAL_PATTERN":
        return "Temporal pattern";
      case "VALIDATED_CONSTRAINT":
        return "Validating constraint";
      case "OPEN_QUESTION":
        return "Open invitation";
      default:
        return category;
    }
  }

  function renderQuestion(question: InlineQuestion) {
    const prefix = /\*\*Reflection question:\*\*/i;
    const remainder = prefix.test(question.text)
      ? question.text.replace(prefix, "").trim()
      : question.text;
    return (
      <div key={question.id} className="rounded-md border border-primary/40 bg-primary/5 p-4 text-sm">
        <p>
          <span className="font-semibold text-primary">Reflection question:</span>{" "}
          <span className="text-foreground">{remainder}</span>
        </p>
        {question.anchorSentence ? (
          <p className="mt-2 text-xs text-muted-foreground">Anchored in “{question.anchorSentence}”</p>
        ) : null}
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(260px,320px)_minmax(0,1fr)]">
        <Card className="order-2 lg:order-1">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base">Margin notes</CardTitle>
            <CardDescription>
              Latest observations. Expand to see full details and act on card edits.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {previewNotes.length === 0 ? (
              <CardDescription>
                Nothing yet—generate a reflection after writing to populate this panel.
              </CardDescription>
            ) : (
              <ul className="space-y-3">
                {previewNotes.map((note) => (
                  <li key={note.id} className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                    <p className="text-xs uppercase text-muted-foreground">{formatCategory(note.category)}</p>
                    <p className="mt-1 font-medium text-foreground">{note.summary}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
          <CardFooter className="flex justify-end border-t bg-muted/40 px-4 py-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsNotesModalOpen(true)}
              disabled={notes.length === 0}
            >
              {notes.length === 0 ? "No notes yet" : "Expand notes"}
            </Button>
          </CardFooter>
        </Card>
        <div className="order-1 flex flex-col gap-4 lg:order-2">
          <Card className="flex min-h-[420px] flex-col">
            <CardHeader className="space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <CardTitle className="text-lg">{formattedDate ?? "New journal entry"}</CardTitle>
                  <CardDescription>
                    Auto-save is on. Lean into the story that matters right now.
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" onClick={onCreateEntry} disabled={isCreatingEntry}>
                    {isCreatingEntry ? "Creating…" : "New entry"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleInsertPrompt}
                    disabled={!entry || isLoading || isPromptInserting}
                  >
                    {isPromptInserting ? "Inserting…" : "Insert prompt"}
                  </Button>
                  <Badge variant={saveStatus === "error" ? "destructive" : "outline"}>{statusLabel}</Badge>
                </div>
              </div>
              {statusMessage ? (
                <p
                  className={`text-xs ${
                    saveStatus === "error" ? "text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {statusMessage}
                </p>
              ) : null}
            </CardHeader>
            <CardContent className="flex-1 p-0">
              <Textarea
                placeholder="This space is yours. Capture what future-you might want to revisit."
                className="min-h-[320px] resize-none rounded-none border-0 bg-transparent px-6 py-4 text-base focus-visible:ring-0"
                value={editableContent}
                onChange={(event) => handleContentChange(event.target.value)}
                disabled={!entry || isLoading}
              />
            </CardContent>
            <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/40 px-6 py-3">
              <div className="flex flex-col text-xs text-muted-foreground">
                <span>
                  {activeEntryPreview
                    ? `Last updated ${format(new Date(activeEntryPreview.updatedAt), "MMM d, yyyy h:mm a")}`
                    : "Create your first entry to begin your archival trail."}
                </span>
                <span>Every keystroke is saved after a short pause.</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleGenerateNotes}
                  disabled={!entry || isGeneratingInsights}
                >
                  {isGeneratingInsights ? "Generating…" : "Generate reflection"}
                </Button>
              </div>
            </CardFooter>
          </Card>
          {inlineQuestions.length > 0 ? (
            <div className="space-y-3">
              <Separator />
              {inlineQuestions.map((question) => renderQuestion(question))}
            </div>
          ) : null}
        </div>
      </div>
      <Dialog open={isNotesModalOpen} onOpenChange={setIsNotesModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Margin notes</DialogTitle>
            <DialogDescription>
              Generated after journaling to surface tensions, patterns, and validating constraints.
            </DialogDescription>
          </DialogHeader>
          {notes.length === 0 ? (
            <CardDescription>
              Nothing yet—generate a reflection once you finish journaling to see observations.
            </CardDescription>
          ) : (
            <ul className="space-y-3">
              {notes.map((note) => {
                const isExpanded = expandedNoteId === note.id;
                return (
                  <li key={note.id} className="rounded-lg border border-border bg-muted/30">
                    <button
                      type="button"
                      className="flex w-full items-start justify-between gap-3 rounded-t-lg px-4 py-3 text-left"
                      onClick={() =>
                        setExpandedNoteId((prev) => (prev === note.id ? null : note.id))
                      }
                    >
                      <div className="space-y-1">
                        <Badge variant="outline">{formatCategory(note.category)}</Badge>
                        <p className="font-medium leading-snug text-foreground">{note.summary}</p>
                      </div>
                      <svg
                        className={cn(
                          "mt-2 size-4 text-muted-foreground transition-transform",
                          isExpanded ? "rotate-180" : "rotate-0",
                        )}
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="6 9 12 15 18 9" />
                      </svg>
                    </button>
                    {isExpanded ? (
                      <div className="space-y-3 border-t border-border px-4 py-3 text-sm leading-relaxed">
                        <p>{note.body}</p>
                        {renderProvenance(note.provenance)}
                        {note.supportsCardEdit ? (
                          <div className="space-y-2">
                            {note.supportsCardEdit.refinedJustification ? (
                              <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                                {note.supportsCardEdit.refinedJustification}
                              </p>
                            ) : null}
                            <Button size="sm" variant="secondary" onClick={() => handleCardEditRequest(note)}>
                              Edit card with this insight
                            </Button>
                          </div>
                        ) : null}
                      </div>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
