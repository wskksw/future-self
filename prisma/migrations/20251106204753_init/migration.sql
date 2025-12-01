-- CreateEnum
CREATE TYPE "PromptFrequency" AS ENUM ('DAILY', 'THREE_PER_WEEK', 'WEEKLY', 'OFF');

-- CreateEnum
CREATE TYPE "PromptCategory" AS ENUM ('VALUE', 'TEMPORAL', 'ANTI_GOAL', 'CONSTRAINT', 'GOAL');

-- CreateEnum
CREATE TYPE "MarginNoteType" AS ENUM ('PATTERN', 'CARD_REFERENCE', 'QUESTION');

-- CreateEnum
CREATE TYPE "ConsentChangeType" AS ENUM ('TOGGLED_ENTRY', 'REVOKE_ALL');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "profile" JSONB,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FutureSelfCard" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "values" TEXT[],
    "sixMonthGoal" TEXT NOT NULL,
    "fiveYearGoal" TEXT NOT NULL,
    "constraints" TEXT NOT NULL,
    "antiGoals" TEXT NOT NULL,
    "identityStmt" TEXT NOT NULL,

    CONSTRAINT "FutureSelfCard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CardRevision" (
    "id" TEXT NOT NULL,
    "cardId" TEXT NOT NULL,
    "editedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "snapshot" JSONB NOT NULL,
    "annotation" TEXT NOT NULL,

    CONSTRAINT "CardRevision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "JournalEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "content" TEXT NOT NULL,
    "consentedForTrends" BOOLEAN NOT NULL DEFAULT false,
    "consentedAt" TIMESTAMP(3),

    CONSTRAINT "JournalEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "frequency" "PromptFrequency" NOT NULL,
    "categories" "PromptCategory"[],
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PromptPreference_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PromptHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "promptType" "PromptCategory" NOT NULL,
    "cardField" TEXT NOT NULL,
    "promptText" TEXT NOT NULL,
    "shownAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "responded" BOOLEAN NOT NULL DEFAULT false,
    "responseId" TEXT,

    CONSTRAINT "PromptHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarginNote" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "MarginNoteType" NOT NULL,
    "text" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarginNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScaffoldResponse" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "schemaId" TEXT NOT NULL,
    "answers" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScaffoldResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PatternSummary" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "summary" JSONB NOT NULL,

    CONSTRAINT "PatternSummary_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConsentChange" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "entryId" TEXT,
    "changeType" "ConsentChangeType" NOT NULL,
    "previous" BOOLEAN,
    "current" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "meta" JSONB,

    CONSTRAINT "ConsentChange_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_createdAt_idx" ON "User"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "FutureSelfCard_userId_key" ON "FutureSelfCard"("userId");

-- CreateIndex
CREATE INDEX "CardRevision_cardId_editedAt_idx" ON "CardRevision"("cardId", "editedAt");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_createdAt_idx" ON "JournalEntry"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "JournalEntry_userId_consentedForTrends_idx" ON "JournalEntry"("userId", "consentedForTrends");

-- CreateIndex
CREATE UNIQUE INDEX "PromptPreference_userId_key" ON "PromptPreference"("userId");

-- CreateIndex
CREATE INDEX "PromptHistory_userId_shownAt_idx" ON "PromptHistory"("userId", "shownAt");

-- CreateIndex
CREATE INDEX "MarginNote_userId_generatedAt_idx" ON "MarginNote"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "ScaffoldResponse_userId_createdAt_idx" ON "ScaffoldResponse"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "PatternSummary_userId_generatedAt_idx" ON "PatternSummary"("userId", "generatedAt");

-- CreateIndex
CREATE INDEX "ConsentChange_userId_createdAt_idx" ON "ConsentChange"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "FutureSelfCard" ADD CONSTRAINT "FutureSelfCard_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CardRevision" ADD CONSTRAINT "CardRevision_cardId_fkey" FOREIGN KEY ("cardId") REFERENCES "FutureSelfCard"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JournalEntry" ADD CONSTRAINT "JournalEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptPreference" ADD CONSTRAINT "PromptPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PromptHistory" ADD CONSTRAINT "PromptHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarginNote" ADD CONSTRAINT "MarginNote_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarginNote" ADD CONSTRAINT "MarginNote_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScaffoldResponse" ADD CONSTRAINT "ScaffoldResponse_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScaffoldResponse" ADD CONSTRAINT "ScaffoldResponse_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternSummary" ADD CONSTRAINT "PatternSummary_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PatternSummary" ADD CONSTRAINT "PatternSummary_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentChange" ADD CONSTRAINT "ConsentChange_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsentChange" ADD CONSTRAINT "ConsentChange_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
