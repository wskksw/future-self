"use client";

import useSWR from "swr";

import type { FutureSelfCard, CardRevision } from "@prisma/client";

type CardResponse = {
  card: (FutureSelfCard & { revisions: CardRevision[] }) | null;
};

export function useCard() {
  const swr = useSWR<CardResponse>("/api/card");

  return {
    ...swr,
    card: swr.data?.card ?? null,
  };
}

