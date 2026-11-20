/*
  Warnings:

  - A unique constraint covering the columns `[blobPath]` on the table `Document` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Document" ADD COLUMN     "blobPath" TEXT,
ALTER COLUMN "diskPath" SET DEFAULT '';

-- CreateIndex
CREATE UNIQUE INDEX "Document_blobPath_key" ON "Document"("blobPath");
