/*
  Warnings:

  - You are about to drop the column `payload` on the `MarginNote` table. All the data in the column will be lost.
  - You are about to drop the column `text` on the `MarginNote` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `MarginNote` table. All the data in the column will be lost.
  - Added the required column `body` to the `MarginNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `category` to the `MarginNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `provenance` to the `MarginNote` table without a default value. This is not possible if the table is not empty.
  - Added the required column `summary` to the `MarginNote` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "MarginNoteCategory" AS ENUM ('CARD_TENSION', 'TEMPORAL_PATTERN', 'VALIDATED_CONSTRAINT', 'OPEN_QUESTION');

-- AlterTable
ALTER TABLE "MarginNote" DROP COLUMN "payload",
DROP COLUMN "text",
DROP COLUMN "type",
ADD COLUMN     "body" TEXT NOT NULL,
ADD COLUMN     "category" "MarginNoteCategory" NOT NULL,
ADD COLUMN     "provenance" JSONB NOT NULL,
ADD COLUMN     "summary" TEXT NOT NULL,
ADD COLUMN     "supportsCardEdit" JSONB;

-- DropEnum
DROP TYPE "MarginNoteType";

-- CreateTable
CREATE TABLE "ReflectionQuestion" (
    "id" TEXT NOT NULL,
    "entryId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "anchorSentence" TEXT,
    "cardElement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReflectionQuestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReflectionQuestion_userId_createdAt_idx" ON "ReflectionQuestion"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "ReflectionQuestion" ADD CONSTRAINT "ReflectionQuestion_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "JournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReflectionQuestion" ADD CONSTRAINT "ReflectionQuestion_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
