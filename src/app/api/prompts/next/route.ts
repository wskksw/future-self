import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser } from "@/lib/session";
import { generateAIPrompt } from "@/lib/ai-service";
import { promptRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = promptRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();

    const card = await prisma.futureSelfCard.findUnique({
      where: { userId: user.id },
    });

    if (!card) {
      return NextResponse.json(
        {
          prompt: {
            id: "missing-card",
            text: "Create your Future-Self Card to unlock reflection prompts.",
            category: "VALUE",
            cardField: "values",
          },
        },
        { status: 200 },
      );
    }

    // Get recent journal entries for context
    const recentEntries = await prisma.journalEntry.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 7,
      select: {
        content: true,
        createdAt: true,
      },
    });

    // Get previous prompts to avoid repetition
    const previousPrompts = await prisma.promptHistory.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { shownAt: "desc" },
      take: 5,
      select: {
        promptText: true,
      },
    });

    // Generate AI-powered prompt
    const generated = await generateAIPrompt({
      card,
      recentEntries,
      previousPrompts: previousPrompts.map((p) => p.promptText),
    });

    const history = await prisma.promptHistory.create({
      data: {
        userId: user.id,
        promptType: generated.category,
        cardField: generated.cardField,
        promptText: generated.text,
      },
    });

    return NextResponse.json({
      prompt: {
        id: history.id,
        text: history.promptText,
        category: history.promptType,
        cardField: history.cardField,
      },
    });
  } catch (error) {
    console.error("Prompt generation error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate prompt" },
      { status: 500 }
    );
  }
}

