import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";

export async function GET() {
  const user = await getOrCreateUser();

  const card = await prisma.futureSelfCard.findUnique({
    where: { userId: user.id },
  });

  if (!card) {
    return NextResponse.json({ revisions: [], currentCard: null });
  }

  const revisions = await prisma.cardRevision.findMany({
    where: { cardId: card.id },
    orderBy: { editedAt: "desc" },
    take: 50, // Increased for better longitudinal view
  });

  // Include current card state for diffing latest revision → current
  const currentCard = {
    values: card.values,
    sixMonthGoal: card.sixMonthGoal,
    fiveYearGoal: card.fiveYearGoal,
    constraints: card.constraints,
    antiGoals: card.antiGoals,
    identityStmt: card.identityStmt,
  };

  return NextResponse.json({ revisions, currentCard });
}

