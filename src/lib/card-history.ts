/**
 * Card History Utilities
 * 
 * Diff logic and stats for longitudinal identity tracking.
 * Supports the "Card Evolution Timeline" and "Stability Indicators" features.
 * 
 * TODO: If history > 100 items, move diff calculation to /api/card/history
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Represents a snapshot of the card at a point in time.
 * Matches the JSON structure stored in CardRevision.snapshot.
 */
export type CardSnapshot = {
  values: string[];
  sixMonthGoal: string;
  fiveYearGoal: string;
  constraints: string;
  antiGoals: string;
  identityStmt: string;
};

export type CardField = keyof CardSnapshot;

export const CARD_FIELD_LABELS: Record<CardField, string> = {
  values: "Values",
  sixMonthGoal: "6-Month Goal",
  fiveYearGoal: "5-Year Goal",
  constraints: "Constraints",
  antiGoals: "Anti-Goals",
  identityStmt: "Identity",
};

export type FieldChange = {
  field: CardField;
  label: string;
  before: string | string[] | null;
  after: string | string[];
};

export type SnapshotDiff = {
  isInitial: boolean;
  hasChanges: boolean;
  changedFields: CardField[];
  changes: FieldChange[];
};

export type FieldStats = {
  [K in CardField]: number;
};

export type RevisionWithDiff = {
  id: string;
  editedAt: Date | string;
  annotation: string;
  snapshot: CardSnapshot;
  diff: SnapshotDiff;
};

// ---------------------------------------------------------------------------
// Date Formatting
// ---------------------------------------------------------------------------

/**
 * Consistent date formatting for revision timestamps.
 * Example: "Dec 1, 2025, 2:30 PM"
 */
export function formatRevisionDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/**
 * Short date format for compact displays.
 * Example: "Dec 1"
 */
export function formatShortDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(d);
}

// ---------------------------------------------------------------------------
// Diff Logic
// ---------------------------------------------------------------------------

/**
 * Compare two snapshots and return what changed.
 * 
 * @param prev - The previous snapshot (null for initial card creation)
 * @param current - The current snapshot
 * @returns SnapshotDiff describing the changes
 */
export function getSnapshotDiff(
  prev: CardSnapshot | null,
  current: CardSnapshot
): SnapshotDiff {
  // Handle initial creation (no previous snapshot)
  if (!prev) {
    const allFields: CardField[] = [
      "values",
      "sixMonthGoal",
      "fiveYearGoal",
      "constraints",
      "antiGoals",
      "identityStmt",
    ];

    return {
      isInitial: true,
      hasChanges: true,
      changedFields: allFields,
      changes: allFields.map((field) => ({
        field,
        label: CARD_FIELD_LABELS[field],
        before: null,
        after: current[field],
      })),
    };
  }

  const changes: FieldChange[] = [];
  const changedFields: CardField[] = [];

  // Compare each field
  const fields: CardField[] = [
    "values",
    "sixMonthGoal",
    "fiveYearGoal",
    "constraints",
    "antiGoals",
    "identityStmt",
  ];

  for (const field of fields) {
    const prevValue = prev[field];
    const currentValue = current[field];

    // Use JSON.stringify for arrays to handle order changes
    const prevStr = Array.isArray(prevValue)
      ? JSON.stringify(prevValue)
      : prevValue;
    const currStr = Array.isArray(currentValue)
      ? JSON.stringify(currentValue)
      : currentValue;

    if (prevStr !== currStr) {
      changedFields.push(field);
      changes.push({
        field,
        label: CARD_FIELD_LABELS[field],
        before: prevValue,
        after: currentValue,
      });
    }
  }

  return {
    isInitial: false,
    hasChanges: changes.length > 0,
    changedFields,
    changes,
  };
}

// ---------------------------------------------------------------------------
// Stats Calculation
// ---------------------------------------------------------------------------

/**
 * Calculate how many times each field was edited across all revisions.
 * Only counts a field as edited if it actually differs from the previous snapshot.
 * 
 * @param revisions - Array of revisions ordered by editedAt DESC (newest first)
 * @param currentCard - The current card state (for comparing latest revision)
 * @returns FieldStats with edit counts per field
 */
export function calculateFieldStats(
  revisions: Array<{ snapshot: unknown }>,
  currentCard?: CardSnapshot | null
): FieldStats {
  const stats: FieldStats = {
    values: 0,
    sixMonthGoal: 0,
    fiveYearGoal: 0,
    constraints: 0,
    antiGoals: 0,
    identityStmt: 0,
  };

  if (revisions.length === 0) return stats;

  // Revisions are ordered DESC, so we iterate from newest to oldest
  // and compare each to its "next" (which is the previous state)
  const snapshots = revisions.map((r) => r.snapshot as CardSnapshot);

  // First, compare current card to the latest revision (if current card provided)
  if (currentCard && snapshots.length > 0) {
    const diff = getSnapshotDiff(snapshots[0], currentCard);
    for (const field of diff.changedFields) {
      stats[field]++;
    }
  }

  // Then compare each revision to the next older one
  for (let i = 0; i < snapshots.length - 1; i++) {
    const newer = snapshots[i];
    const older = snapshots[i + 1];
    const diff = getSnapshotDiff(older, newer);

    for (const field of diff.changedFields) {
      stats[field]++;
    }
  }

  // The oldest revision represents the initial creation
  // Count all non-empty fields as "edits" (initial creation)
  if (snapshots.length > 0) {
    const oldest = snapshots[snapshots.length - 1];
    const initialDiff = getSnapshotDiff(null, oldest);
    for (const field of initialDiff.changedFields) {
      stats[field]++;
    }
  }

  return stats;
}

/**
 * Prepare revisions with computed diffs for timeline display.
 * Returns revisions with their diffs pre-calculated.
 * 
 * @param revisions - Array of revisions ordered by editedAt DESC
 * @param currentCard - The current card state
 * @returns Array of RevisionWithDiff
 */
export function prepareRevisionsWithDiffs(
  revisions: Array<{
    id: string;
    editedAt: Date | string;
    annotation: string;
    snapshot: unknown
  }>,
  currentCard?: CardSnapshot | null
): RevisionWithDiff[] {
  if (revisions.length === 0) return [];

  const result: RevisionWithDiff[] = [];
  const snapshots = revisions.map((r) => r.snapshot as CardSnapshot);

  for (let i = 0; i < revisions.length; i++) {
    const revision = revisions[i];
    const currentSnapshot = snapshots[i];

    // For the newest revision, compare to current card state
    // For others, compare to the next newer revision
    let nextState: CardSnapshot | null;

    if (i === 0 && currentCard) {
      // Newest revision: compare snapshot (before) to current card (after)
      nextState = currentCard;
    } else if (i > 0) {
      // Older revision: compare to the next newer snapshot
      nextState = snapshots[i - 1];
    } else {
      // Fallback: no comparison available
      nextState = null;
    }

    // Note: For display, we want to show what changed FROM this snapshot TO the next state
    // The snapshot represents the state BEFORE this edit was made
    // So diff shows: snapshot (before) → what it became (after)
    const diff = nextState
      ? getSnapshotDiff(currentSnapshot, nextState)
      : getSnapshotDiff(null, currentSnapshot); // Initial creation

    result.push({
      id: revision.id,
      editedAt: revision.editedAt,
      annotation: revision.annotation,
      snapshot: currentSnapshot,
      diff,
    });
  }

  return result;
}

/**
 * Get total revision count for display.
 */
export function getTotalEditCount(stats: FieldStats): number {
  return Object.values(stats).reduce((sum, count) => sum + count, 0);
}

/**
 * Determine if a field should show stability indicator.
 * Only show if edit count >= 3 to avoid noise.
 */
export function shouldShowStabilityIndicator(editCount: number): boolean {
  return editCount >= 3;
}

/**
 * Get visual dot representation for stability indicator.
 * Caps at 5 dots to avoid clutter.
 */
export function getStabilityDots(editCount: number): string {
  return "●".repeat(Math.min(editCount, 5));
}
