import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";
import { updateEntrySchema } from "@/lib/validators";

type Params = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;
  const user = await getOrCreateUser();
  const entry = await prisma.journalEntry.findFirst({
    where: {
      id,
      userId: user.id,
    },
    include: {
      marginNotes: {
        orderBy: { generatedAt: "desc" },
      },
      reflectionQuestions: {
        orderBy: { createdAt: "desc" },
      },
      scaffoldResponses: true,
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  return NextResponse.json({ entry });
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const body = await request.json();
  const parsed = updateEntrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { id } = await params;
  const user = await getOrCreateUser();
  const entry = await prisma.journalEntry.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!entry) {
    return NextResponse.json({ error: "Entry not found" }, { status: 404 });
  }

  const data = parsed.data;
  const updateData: Record<string, unknown> = {};

  if (typeof data.content === "string") {
    updateData.content = data.content;
  }

  const updated = await prisma.journalEntry.update({
    where: { id: entry.id },
    data: updateData,
  });

  return NextResponse.json({ entry: updated });
}
