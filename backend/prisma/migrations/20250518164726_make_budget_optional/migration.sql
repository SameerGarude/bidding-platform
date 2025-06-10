/*
  Warnings:

  - You are about to alter the column `budgetMin` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.
  - You are about to alter the column `budgetMax` on the `Project` table. The data in that column could be lost. The data in that column will be cast from `DoublePrecision` to `Integer`.

*/
-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "budgetMin" DROP NOT NULL,
ALTER COLUMN "budgetMin" SET DATA TYPE INTEGER,
ALTER COLUMN "budgetMax" DROP NOT NULL,
ALTER COLUMN "budgetMax" SET DATA TYPE INTEGER;
