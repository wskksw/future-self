"use client";

import { ChevronRightIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  formatRevisionDate,
  type RevisionWithDiff,
  type FieldChange,
} from "@/lib/card-history";

type RevisionItemProps = {
  revision: RevisionWithDiff;
  isLatest?: boolean;
};

export function RevisionItem({ revision, isLatest }: RevisionItemProps) {
  const { diff, annotation, editedAt } = revision;

  return (
    <div className="relative border-l-2 border-muted pb-6 pl-4 last:pb-0">
      {/* Timeline dot */}
      <div className="absolute -left-[5px] top-0 h-2 w-2 rounded-full bg-primary" />

      {/* Date - always visible */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-foreground">
          {formatRevisionDate(editedAt)}
        </span>
        {isLatest && (
          <Badge variant="secondary" className="text-xs">
            Latest
          </Badge>
        )}
        {diff.isInitial && (
          <Badge variant="outline" className="text-xs">
            Card Created
          </Badge>
        )}
      </div>

      {/* Annotation - always visible, emphasized */}
      <p className="mt-1 text-sm italic text-muted-foreground">
        &ldquo;{annotation}&rdquo;
      </p>

      {/* Changed field badges */}
      {diff.changedFields.length > 0 && !diff.isInitial && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {diff.changedFields.map((field) => (
            <Badge key={field} variant="secondary" className="text-xs">
              {field === "sixMonthGoal"
                ? "6M Goal"
                : field === "fiveYearGoal"
                  ? "5Y Goal"
                  : field === "identityStmt"
                    ? "Identity"
                    : field === "antiGoals"
                      ? "Anti-Goals"
                      : field.charAt(0).toUpperCase() + field.slice(1)}
            </Badge>
          ))}
        </div>
      )}

      {/* Collapsible diff details */}
      {diff.changes.length > 0 && (
        <Collapsible className="mt-3">
          <CollapsibleTrigger className="text-xs text-muted-foreground hover:text-foreground">
            <ChevronRightIcon className="h-3 w-3 transition-transform" />
            {diff.isInitial ? "Show initial values" : "Show changes"}
          </CollapsibleTrigger>
          <CollapsibleContent>
            <div className="mt-2 space-y-3">
              {diff.changes.map((change) => (
                <FieldDiffView key={change.field} change={change} />
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

function FieldDiffView({ change }: { change: FieldChange }) {
  const { label, before, after } = change;

  // Format array values for display
  const formatValue = (value: string | string[] | null): string => {
    if (value === null) return "(not set)";
    if (Array.isArray(value)) return value.join(", ");
    return value || "(empty)";
  };

  // For initial creation, only show "after"
  if (before === null) {
    return (
      <div className="rounded-md border bg-muted/30 p-2">
        <div className="text-xs font-medium text-muted-foreground">{label}</div>
        <div className="mt-1 text-sm text-foreground">{formatValue(after)}</div>
      </div>
    );
  }

  return (
    <div className="rounded-md border bg-muted/30 p-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 grid grid-cols-2 gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Before</div>
          <div className="mt-0.5 text-sm text-foreground/70 line-through decoration-destructive/50">
            {formatValue(before)}
          </div>
        </div>
        <div>
          <div className="text-xs text-muted-foreground">After</div>
          <div className="mt-0.5 text-sm text-foreground">
            {formatValue(after)}
          </div>
        </div>
      </div>
    </div>
  );
}
