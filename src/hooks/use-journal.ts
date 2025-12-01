"use client";

import useSWR from "swr";

type JournalListEntry = {
  id: string;
  createdAt: string;
  updatedAt: string;
  content: string;
  preview: string;
};

type JournalListResponse = {
  entries: JournalListEntry[];
};

type JournalEntryResponse = {
    entry: {
      id: string;
      content: string;
      createdAt: string;
      updatedAt: string;
      marginNotes: {
        id: string;
        category: string;
        summary: string;
        body: string;
        provenance: Record<string, unknown>;
        supportsCardEdit?: Record<string, unknown> | null;
        generatedAt: string;
      }[];
      reflectionQuestions: {
        id: string;
        text: string;
        anchorSentence?: string | null;
        cardElement?: string | null;
        createdAt: string;
      }[];
  };
};

export function useJournalEntries() {
  const swr = useSWR<JournalListResponse>("/api/journal");

  return {
    ...swr,
    entries: swr.data?.entries ?? [],
  };
}

export function useJournalEntry(id?: string) {
  const swr = useSWR<JournalEntryResponse>(id ? `/api/journal/${id}` : null, {
    refreshInterval: 0,
  });

  return {
    ...swr,
    entry: swr.data?.entry,
  };
}
