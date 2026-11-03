-- AlterTable
ALTER TABLE "Link" ADD COLUMN     "creatorIpHash" TEXT,
ADD COLUMN     "manageTokenHash" TEXT;

-- CreateIndex
CREATE INDEX "Link_creatorIpHash_createdAt_idx" ON "Link"("creatorIpHash", "createdAt");
