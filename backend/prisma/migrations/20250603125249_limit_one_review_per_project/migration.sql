/*
  Warnings:

  - You are about to drop the column `deliverables` on the `Project` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[projectId]` on the table `Review` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Project" DROP COLUMN "deliverables",
ADD COLUMN     "deliverableUrl" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Review_projectId_key" ON "Review"("projectId");
