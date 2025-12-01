"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import type { CardRevision, FutureSelfCard } from "@prisma/client";

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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { CardEditIntent } from "@/types/card-edit-intent";

type CardWithRevisions = (FutureSelfCard & { revisions: CardRevision[] }) | null;

type CardPanelProps = {
  card: CardWithRevisions;
  isLoading: boolean;
  onCardUpdated: () => void;
  editIntent?: CardEditIntent | null;
  onEditIntentConsumed?: () => void;
};

type FormState = {
  values: string;
  sixMonthGoal: string;
  fiveYearGoal: string;
  constraints: string;
  antiGoals: string;
  identityStmt: string;
  annotation: string;
};

const defaultFormState: FormState = {
  values: "",
  sixMonthGoal: "",
  fiveYearGoal: "",
  constraints: "",
  antiGoals: "",
  identityStmt: "",
  annotation: "",
};

function toFormState(card: FutureSelfCard | null): FormState {
  if (!card) return defaultFormState;
  return {
    values: card.values.join(", "),
    sixMonthGoal: card.sixMonthGoal,
    fiveYearGoal: card.fiveYearGoal,
    constraints: card.constraints,
    antiGoals: card.antiGoals,
    identityStmt: card.identityStmt,
    annotation: "",
  };
}

function formatTimestamp(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return format(date, "MMM d, yyyy • h:mm a");
}

export function CardPanel({
  card,
  isLoading,
  onCardUpdated,
  editIntent,
  onEditIntentConsumed,
}: CardPanelProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formState, setFormState] = useState<FormState>(toFormState(card));
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [intentDetails, setIntentDetails] = useState<CardEditIntent | null>(null);

  const valuesRef = useRef<HTMLInputElement | null>(null);
  const sixMonthRef = useRef<HTMLTextAreaElement | null>(null);
  const fiveYearRef = useRef<HTMLTextAreaElement | null>(null);
  const constraintsRef = useRef<HTMLTextAreaElement | null>(null);
  const antiGoalsRef = useRef<HTMLTextAreaElement | null>(null);
  const identityRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setFormState(toFormState(card));
  }, [card]);

  useEffect(() => {
    if (!isDialogOpen) {
      setIntentDetails(null);
    }
  }, [isDialogOpen]);

  useEffect(() => {
    if (!editIntent) return;
    setIntentDetails(editIntent);
    setIsDialogOpen(true);
    setFormState((prev) => ({
      ...prev,
      annotation: prev.annotation || editIntent.modalCopy || `Prompted by: ${editIntent.summary}`,
    }));
    onEditIntentConsumed?.();
  }, [editIntent, onEditIntentConsumed]);

  useEffect(() => {
    if (!isDialogOpen || !intentDetails) return;
    const fieldMap: Record<string, React.RefObject<HTMLInputElement | HTMLTextAreaElement>> = {
      values: valuesRef,
      sixMonthGoal: sixMonthRef,
      fiveYearGoal: fiveYearRef,
      constraints: constraintsRef,
      antiGoals: antiGoalsRef,
      identityStmt: identityRef,
    };
    const ref = fieldMap[intentDetails.field];
    ref?.current?.focus();
  }, [isDialogOpen, intentDetails]);

  const parsedValues = useMemo(
    () =>
      formState.values
        .split(",")
        .map((value) => value.trim())
        .filter(Boolean),
    [formState.values],
  );

  const valueCountError =
    parsedValues.length > 0 && (parsedValues.length < 3 || parsedValues.length > 5)
      ? "Capture 3 to 5 values to keep the card focused."
      : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (valueCountError) {
      setError(valueCountError);
      return;
    }

    if (!formState.annotation.trim()) {
      setError("Share a short annotation about what prompted this change.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/card", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          values: parsedValues,
          sixMonthGoal: formState.sixMonthGoal,
          fiveYearGoal: formState.fiveYearGoal,
          constraints: formState.constraints,
          antiGoals: formState.antiGoals,
          identityStmt: formState.identityStmt,
          annotation: formState.annotation,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        const message =
          typeof result?.error === "string"
            ? result.error
            : result?.error?.formErrors?.join(" ") ?? "Unable to save card.";
        throw new Error(message);
      }

      await onCardUpdated();
      setIsDialogOpen(false);
      setFormState((prev) => ({ ...prev, annotation: "" }));
      setIntentDetails(null);
    } catch (savingError) {
      setError((savingError as Error).message);
    } finally {
      setIsSaving(false);
    }
  }

  const cardDetails = card ? (
    <div className="space-y-4 text-sm leading-relaxed">
      <div>
        <p className="text-xs uppercase text-muted-foreground">Values</p>
        <p className="mt-1 text-base font-medium text-foreground">
          {card.values.join(" · ")}
        </p>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">6-month goal</p>
        <p className="mt-1 text-foreground">{card.sixMonthGoal}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">5-year goal</p>
        <p className="mt-1 text-foreground">{card.fiveYearGoal}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">Constraints</p>
        <p className="mt-1 text-foreground">{card.constraints}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">Anti-goals</p>
        <p className="mt-1 text-foreground">{card.antiGoals}</p>
      </div>
      <div>
        <p className="text-xs uppercase text-muted-foreground">Identity statement</p>
        <p className="mt-1 text-base italic text-foreground">“{card.identityStmt}”</p>
      </div>
    </div>
  ) : (
    <p className="text-sm text-muted-foreground">
      Articulate your future-self card to ground every prompt, pattern, and question in your own
      language.
    </p>
  );

  return (
    <>
      <Card className="h-full">
        <CardHeader className="space-y-1">
          <CardTitle className="text-lg">Future-self card</CardTitle>
          <CardDescription>
            A living document that scaffolds every reflection you invite.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">{isLoading ? <SkeletonCard /> : cardDetails}</CardContent>
        <CardFooter className="flex items-center justify-between border-t bg-muted/40">
          <div className="flex flex-col gap-1 text-xs text-muted-foreground">
            <span>
              {card
                ? `Last updated ${formatTimestamp(card.updatedAt)}`
                : "No card yet—start by naming the identity you're negotiating."}
            </span>
            {card ? (
              <span>Created {formatTimestamp(card.createdAt)}</span>
            ) : (
              <span>Your card keeps the system anchored in your voice.</span>
            )}
          </div>
          <Button size="sm" onClick={() => setIsDialogOpen(true)}>
            {card ? "Edit card" : "Create card"}
          </Button>
        </CardFooter>
        {card?.revisions?.length ? (
          <>
            <Separator />
            <CardContent className="pt-4">
              <p className="text-sm font-medium text-foreground">Recent revisions</p>
              <ScrollArea className="mt-3 h-40 rounded-md border">
                <div className="space-y-3 p-3 text-sm">
                  {card.revisions.map((revision) => {
                    const snapshot = revision.snapshot as Record<string, unknown>;
                    return (
                      <div key={revision.id} className="space-y-2 rounded-md bg-muted/40 p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>{formatTimestamp(revision.editedAt)}</span>
                          <Badge variant="outline">Annotation</Badge>
                        </div>
                        <p className="text-sm text-foreground">{revision.annotation}</p>
                        <Separator className="my-2" />
                        <div className="grid gap-1 text-xs text-muted-foreground">
                          {"values" in snapshot ? (
                            <span>Values: {(snapshot.values as string[]).join(", ")}</span>
                          ) : null}
                          {"sixMonthGoal" in snapshot ? (
                            <span>6m goal: {snapshot.sixMonthGoal as string}</span>
                          ) : null}
                          {"fiveYearGoal" in snapshot ? (
                            <span>5y goal: {snapshot.fiveYearGoal as string}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </>
        ) : null}
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{card ? "Update your card" : "Create your card"}</DialogTitle>
            <DialogDescription>
              Capture the future self you&apos;re in conversation with—values, goals, constraints, and
              who you refuse to become.
            </DialogDescription>
          </DialogHeader>
          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            {intentDetails ? (
              <div className="rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
                <p className="font-semibold text-primary">{intentDetails.summary}</p>
                <p className="text-muted-foreground text-sm">
                  {intentDetails.modalCopy ?? intentDetails.body}
                </p>
              </div>
            ) : null}
            <div className="space-y-2">
              <Label
                htmlFor="values"
                className={cn(intentDetails?.field === "values" ? "text-primary" : undefined)}
              >
                Values (3-5 keywords)
              </Label>
              <Input
                id="values"
                ref={valuesRef}
                value={formState.values}
                placeholder="creativity, sustainable ambition, tenderness"
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, values: event.target.value }))
                }
              />
              {valueCountError ? (
                <p className="text-xs text-destructive">{valueCountError}</p>
              ) : null}
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label
                  htmlFor="sixMonthGoal"
                  className={cn(intentDetails?.field === "sixMonthGoal" ? "text-primary" : undefined)}
                >
                  6-month goal
                </Label>
                <Textarea
                  id="sixMonthGoal"
                  ref={sixMonthRef}
                  value={formState.sixMonthGoal}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, sixMonthGoal: event.target.value }))
                  }
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="fiveYearGoal"
                  className={cn(intentDetails?.field === "fiveYearGoal" ? "text-primary" : undefined)}
                >
                  5-year goal
                </Label>
                <Textarea
                  id="fiveYearGoal"
                  ref={fiveYearRef}
                  value={formState.fiveYearGoal}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, fiveYearGoal: event.target.value }))
                  }
                  rows={4}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="constraints"
                className={cn(intentDetails?.field === "constraints" ? "text-primary" : undefined)}
              >
                Constraints (time, resources, context)
              </Label>
              <Textarea
                id="constraints"
                ref={constraintsRef}
                value={formState.constraints}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, constraints: event.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="antiGoals"
                className={cn(intentDetails?.field === "antiGoals" ? "text-primary" : undefined)}
              >
                Anti-goals (who you refuse to become)
              </Label>
              <Textarea
                id="antiGoals"
                ref={antiGoalsRef}
                value={formState.antiGoals}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, antiGoals: event.target.value }))
                }
                rows={4}
              />
            </div>
            <div className="space-y-2">
              <Label
                htmlFor="identityStmt"
                className={cn(intentDetails?.field === "identityStmt" ? "text-primary" : undefined)}
              >
                Identity statement
              </Label>
              <Textarea
                id="identityStmt"
                ref={identityRef}
                value={formState.identityStmt}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, identityStmt: event.target.value }))
                }
                placeholder='Future-me in 5 years is...'
                rows={4}
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="annotation">What prompted this change?</Label>
              <Textarea
                id="annotation"
                value={formState.annotation}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, annotation: event.target.value }))
                }
                placeholder="A brief note so future-you remembers why this shifted."
                rows={3}
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save card"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SkeletonCard() {
  return (
    <div className="space-y-4">
      <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
      <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-4 w-full animate-pulse rounded bg-muted" />
      <div className="h-4 w-4/5 animate-pulse rounded bg-muted" />
      <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  );
}
