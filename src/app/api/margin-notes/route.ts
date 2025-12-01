import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { generatePostJournalInsights } from "@/lib/ai-service";
import { getAuthenticatedUser } from "@/lib/session";
import { marginNoteRequestSchema } from "@/lib/validators";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = marginNoteRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const user = await getAuthenticatedUser();
    const { entryId, content } = parsed.data;

    const entry = await prisma.journalEntry.findFirst({
      where: { id: entryId, userId: user.id },
    });

    if (!entry) {
      return NextResponse.json({ error: "Entry not found" }, { status: 404 });
    }

    const card = await prisma.futureSelfCard.findUnique({
      where: { userId: user.id },
    });

    const historicalEntries = await prisma.journalEntry.findMany({
      where: {
        userId: user.id,
      },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        content: true,
        createdAt: true,
      },
    });

    const insights = await generatePostJournalInsights({
      entryContent: content ?? entry.content,
      card,
      historicalEntries,
    });

    const saved = await prisma.$transaction(async (tx) => {
      await tx.marginNote.deleteMany({
        where: { entryId: entry.id },
      });
      await tx.reflectionQuestion.deleteMany({
        where: { entryId: entry.id },
      });

      const noteRecords = await Promise.all(
        insights.notes.map((note) =>
          tx.marginNote.create({
            data: {
              entryId: entry.id,
              userId: user.id,
              category: note.category,
              summary: note.summary,
              body: note.body,
              provenance: note.provenance ?? {},
              supportsCardEdit: note.supportsCardEdit ?? null,
            },
          }),
        ),
      );

      const questionRecords = await Promise.all(
        insights.inlineQuestions.map((question) =>
          tx.reflectionQuestion.create({
            data: {
              entryId: entry.id,
              userId: user.id,
              text: question.text,
              anchorSentence: question.anchorSentence ?? null,
              cardElement: question.cardElement ?? null,
            },
          }),
        ),
      );

      return { noteRecords, questionRecords };
    });

    return NextResponse.json({
      notes: saved.noteRecords.map((note) => ({
        id: note.id,
        category: note.category,
        summary: note.summary,
        body: note.body,
        provenance: note.provenance,
        supportsCardEdit: note.supportsCardEdit,
        generatedAt: note.generatedAt,
      })),
      inlineQuestions: saved.questionRecords.map((question) => ({
        id: question.id,
        text: question.text,
        anchorSentence: question.anchorSentence,
        cardElement: question.cardElement,
        createdAt: question.createdAt,
      })),
    });
  } catch (error) {
    console.error("Margin notes generation error:", error);

    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Failed to generate margin notes" },
      { status: 500 }
    );
  }
}
