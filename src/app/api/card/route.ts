import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";
import { cardPayloadSchema } from "@/lib/validators";

export async function GET() {
  const user = await getOrCreateUser();
  const card = await prisma.futureSelfCard.findUnique({
    where: { userId: user.id },
    include: {
      revisions: {
        orderBy: { editedAt: "desc" },
        take: 10,
      },
    },
  });

  return NextResponse.json({ card });
}

export async function PUT(request: Request) {
  const user = await getOrCreateUser();
  const body = await request.json();
  const parsed = cardPayloadSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const payload = parsed.data;

  const trimmedValues = payload.values.map((value) => value.trim());
  const annotation = payload.annotation.trim();

  const result = await prisma.$transaction(async (tx) => {
    const existing = await tx.futureSelfCard.findUnique({
      where: { userId: user.id },
    });

    if (existing) {
      await tx.cardRevision.create({
        data: {
          cardId: existing.id,
          annotation,
          snapshot: {
            values: existing.values,
            sixMonthGoal: existing.sixMonthGoal,
            fiveYearGoal: existing.fiveYearGoal,
            constraints: existing.constraints,
            antiGoals: existing.antiGoals,
            identityStmt: existing.identityStmt,
            updatedAt: existing.updatedAt,
          },
        },
      });

      return tx.futureSelfCard.update({
        where: { id: existing.id },
        data: {
          values: trimmedValues,
          sixMonthGoal: payload.sixMonthGoal.trim(),
          fiveYearGoal: payload.fiveYearGoal.trim(),
          constraints: payload.constraints.trim(),
          antiGoals: payload.antiGoals.trim(),
          identityStmt: payload.identityStmt.trim(),
        },
        include: {
          revisions: {
            orderBy: { editedAt: "desc" },
            take: 10,
          },
        },
      });
    }

    const created = await tx.futureSelfCard.create({
      data: {
        userId: user.id,
        values: trimmedValues,
        sixMonthGoal: payload.sixMonthGoal.trim(),
        fiveYearGoal: payload.fiveYearGoal.trim(),
        constraints: payload.constraints.trim(),
        antiGoals: payload.antiGoals.trim(),
        identityStmt: payload.identityStmt.trim(),
      },
      include: {
        revisions: {
          orderBy: { editedAt: "desc" },
          take: 10,
        },
      },
    });

    await tx.cardRevision.create({
      data: {
        cardId: created.id,
        annotation,
        snapshot: {
          values: created.values,
          sixMonthGoal: created.sixMonthGoal,
          fiveYearGoal: created.fiveYearGoal,
          constraints: created.constraints,
          antiGoals: created.antiGoals,
          identityStmt: created.identityStmt,
        },
      },
    });

    return created;
  });

  return NextResponse.json({ card: result });
}

