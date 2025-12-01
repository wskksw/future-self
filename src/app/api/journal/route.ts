import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";
import { createEntrySchema } from "@/lib/validators";

export async function GET() {
  const user = await getOrCreateUser();

  const entries = await prisma.journalEntry.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      updatedAt: true,
      content: true,
    },
  });

  const summarized = entries.map((entry) => ({
    ...entry,
    preview: entry.content.slice(0, 180),
  }));

  return NextResponse.json({ entries: summarized });
}

export async function POST(request: Request) {
  const user = await getOrCreateUser();
  const body = await request.json();
  const parsed = createEntrySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const data = parsed.data;

  const entry = await prisma.journalEntry.create({
    data: {
      userId: user.id,
      content: data.content ?? "",
    },
  });

  return NextResponse.json({ entry }, { status: 201 });
}
