import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";

export async function GET() {
  const user = await getOrCreateUser();

  const card = await prisma.futureSelfCard.findUnique({
    where: { userId: user.id },
  });

  if (!card) {
    return NextResponse.json({ revisions: [] });
  }

  const revisions = await prisma.cardRevision.findMany({
    where: { cardId: card.id },
    orderBy: { editedAt: "desc" },
    take: 25,
  });

  return NextResponse.json({ revisions });
}

