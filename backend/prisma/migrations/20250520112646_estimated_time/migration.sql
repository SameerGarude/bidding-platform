/*
  Warnings:

  - The `estimatedTime` column on the `Bid` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "Bid" DROP COLUMN "estimatedTime",
ADD COLUMN     "estimatedTime" INTEGER;
