"use client";

import useSWRMutation from "swr/mutation";

type Prompt = {
  id: string;
  text: string;
  category: string;
  cardField: string;
};

type PromptResponse = {
  prompt: Prompt;
};

async function sendRequest(url: string) {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    const error = new Error("Failed to get prompt");
    (error as Record<string, unknown>).info = errorBody;
    (error as Record<string, unknown>).status = response.status;
    throw error;
  }

  return (await response.json()) as PromptResponse;
}

export function usePrompt() {
  return useSWRMutation("/api/prompts/next", async (url: string) => sendRequest(url));
}

