import { CardOnboarding } from "@/components/onboarding/card-onboarding";
import { MainShell } from "@/components/main-shell";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/lib/session";

export default async function Home() {
  const user = await getOrCreateUser();
  const card = await prisma.futureSelfCard.findUnique({
    where: { userId: user.id },
  });

  if (!card) {
    return <CardOnboarding />;
  }

  return <MainShell />;
}

