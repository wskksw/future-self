"use client";

import { ReactNode, useMemo } from "react";
import { SWRConfig } from "swr";

type Props = {
  children: ReactNode;
};

const fetcher = async (resource: string, init?: RequestInit) => {
  const response = await fetch(resource, {
    credentials: "include",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error("Request failed");
    (error as Record<string, unknown>).info = errorBody;
    (error as Record<string, unknown>).status = response.status;
    throw error;
  }

  return response.json();
};

export function SWRProvider({ children }: Props) {
  const value = useMemo(
    () => ({
      fetcher,
      revalidateOnFocus: false,
    }),
    [],
  );

  return <SWRConfig value={value}>{children}</SWRConfig>;
}

