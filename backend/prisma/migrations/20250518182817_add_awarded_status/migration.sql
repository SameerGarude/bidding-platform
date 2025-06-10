/*
  Warnings:

  - Made the column `budgetMin` on table `Project` required. This step will fail if there are existing NULL values in that column.
  - Made the column `budgetMax` on table `Project` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterEnum
ALTER TYPE "ProjectStatus" ADD VALUE 'AWARDED';

-- AlterTable
ALTER TABLE "Project" ALTER COLUMN "budgetMin" SET NOT NULL,
ALTER COLUMN "budgetMax" SET NOT NULL;
