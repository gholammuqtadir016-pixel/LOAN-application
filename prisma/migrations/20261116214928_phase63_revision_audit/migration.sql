-- AlterTable
ALTER TABLE "Application" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "SecurityAudit" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "applicationId" TEXT,
    "action" TEXT NOT NULL,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SecurityAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SecurityAudit_actorId_createdAt_idx" ON "SecurityAudit"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "SecurityAudit_applicationId_createdAt_idx" ON "SecurityAudit"("applicationId", "createdAt");
