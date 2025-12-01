"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type FormState = {
  values: string;
  sixMonthGoal: string;
  fiveYearGoal: string;
  constraints: string;
  antiGoals: string;
  identityStmt: string;
  annotation: string;
};

const initialState: FormState = {
  values: "",
  sixMonthGoal: "",
  fiveYearGoal: "",
  constraints: "",
  antiGoals: "",
  identityStmt: "",
  annotation: "",
};

export function CardOnboarding() {
  const router = useRouter();
  const [formState, setFormState] = useState<FormState>(initialState);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      ? "Capture 3 to 5 values so your card stays focused."
      : null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (valueCountError) {
      setError(valueCountError);
      return;
    }

    if (!formState.annotation.trim()) {
      setError("Share a short note on what is bringing you to this future-self card.");
      return;
    }

    setIsSubmitting(true);
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

      router.refresh();
    } catch (submitError) {
      setError((submitError as Error).message);
      setIsSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto flex min-h-screen w-full max-w-3xl flex-col justify-center px-6 py-16">
        <div className="mb-8 space-y-3 text-center">
          <p className="text-sm uppercase tracking-widest text-muted-foreground">Future-self studio</p>
          <h1 className="text-3xl font-semibold tracking-tight">
            Start with the card—everything else anchors to it.
          </h1>
          <p className="text-base text-muted-foreground">
            Name the version of you you&apos;re in conversation with. Prompts, questions, and
            patterns will reference this card and nothing else.
          </p>
        </div>

        <Card>
          <CardHeader className="space-y-1">
            <CardTitle>Create your Future-self Card</CardTitle>
            <CardDescription>
              Capture values, trajectories, constraints, and anti-goals. This is a living document—
              revisions are welcome.
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="values">Values (3-5 keywords)</Label>
                <Input
                  id="values"
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
                  <Label htmlFor="sixMonthGoal">6-month goal</Label>
                  <Textarea
                    id="sixMonthGoal"
                    value={formState.sixMonthGoal}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, sixMonthGoal: event.target.value }))
                    }
                    rows={4}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fiveYearGoal">5-year goal</Label>
                  <Textarea
                    id="fiveYearGoal"
                    value={formState.fiveYearGoal}
                    onChange={(event) =>
                      setFormState((prev) => ({ ...prev, fiveYearGoal: event.target.value }))
                    }
                    rows={4}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="constraints">Constraints (time, resources, context)</Label>
                <Textarea
                  id="constraints"
                  value={formState.constraints}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, constraints: event.target.value }))
                  }
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="antiGoals">Anti-goals (who you refuse to become)</Label>
                <Textarea
                  id="antiGoals"
                  value={formState.antiGoals}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, antiGoals: event.target.value }))
                  }
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="identityStmt">Identity statement</Label>
                <Textarea
                  id="identityStmt"
                  value={formState.identityStmt}
                  placeholder='Future-me in 5 years is...'
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, identityStmt: event.target.value }))
                  }
                  rows={4}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="annotation">What prompted this version of your card?</Label>
                <Textarea
                  id="annotation"
                  value={formState.annotation}
                  onChange={(event) =>
                    setFormState((prev) => ({ ...prev, annotation: event.target.value }))
                  }
                  rows={3}
                />
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </CardContent>
            <CardFooter className="flex justify-end gap-3">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving…" : "Create card"}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}

