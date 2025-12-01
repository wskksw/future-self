import type { FutureSelfCard } from "@prisma/client";

const STOP_WORDS = new Set([
  "this",
  "that",
  "with",
  "have",
  "from",
  "they",
  "their",
  "about",
  "there",
  "would",
  "could",
  "should",
  "which",
  "these",
  "those",
  "today",
  "again",
  "after",
  "before",
  "being",
  "doing",
  "into",
  "through",
  "where",
  "while",
  "because",
  "every",
  "think",
  "maybe",
]);

export type MarginNoteDraft = {
  type: "PATTERN" | "CARD_REFERENCE" | "QUESTION";
  text: string;
  payload?: Record<string, unknown>;
};

type TokenFrequency = Record<string, number>;

function tokenize(content: string) {
  return content
    .toLowerCase()
    .match(/[a-zA-Z\u00C0-\u017F']+/g)
    ?.filter((word) => word.length >= 4 && !STOP_WORDS.has(word)) ?? [];
}

function countTokens(contents: string[]): TokenFrequency {
  return contents.reduce<TokenFrequency>((acc, content) => {
    const tokens = tokenize(content);
    const uniqueTokens = new Set(tokens);

    uniqueTokens.forEach((token) => {
      acc[token] = (acc[token] ?? 0) + 1;
    });

    return acc;
  }, {});
}

export function generateMarginNotes(params: {
  entryContent: string;
  card: FutureSelfCard | null;
  historicalEntries: { content: string; createdAt: Date }[];
}): MarginNoteDraft[] {
  const notes: MarginNoteDraft[] = [];
  const { entryContent, card, historicalEntries } = params;

  if (!entryContent.trim()) {
    if (card) {
      const value = card.values[0];
      if (value) {
        notes.push({
          type: "CARD_REFERENCE",
          text: `[Card reference] Your card says: '${value}'`,
          payload: { cardField: value },
        });
      }
    }
    return notes;
  }

  if (historicalEntries.length >= 2) {
    const frequencies = countTokens(historicalEntries.map((entry) => entry.content));
    const patterns = Object.entries(frequencies)
      .filter(([, count]) => count >= 3)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2);

    patterns.forEach(([phrase, count]) => {
      notes.push({
        type: "PATTERN",
        text: `[Pattern noticed] You've mentioned '${phrase}' ${count} times recently`,
        payload: { phrase, count },
      });
    });
  }

  if (card) {
    const lowerContent = entryContent.toLowerCase();
    const cardValues = card.values ?? [];
    const matchedValue = cardValues.find((value) => lowerContent.includes(value.toLowerCase()));

    if (matchedValue) {
      notes.push({
        type: "CARD_REFERENCE",
        text: `[Card reference] Your card says: '${matchedValue}'`,
        payload: { cardField: matchedValue },
      });
    } else if (card.identityStmt) {
      notes.push({
        type: "CARD_REFERENCE",
        text: `[Card reference] Your card says: '${card.identityStmt}'`,
        payload: { cardField: "identityStmt" },
      });
    }
  }

  if (card) {
    const anchor = card.values[0] ?? card.identityStmt ?? "future self";
    notes.push({
      type: "QUESTION",
      text: `[Question] What feels most aligned with '${anchor}' in what you just wrote?`,
      payload: { anchor },
    });
  } else {
    notes.push({
      type: "QUESTION",
      text: "[Question] What part of this entry feels most important to remember later?",
    });
  }

  return notes.slice(0, 4);
}
