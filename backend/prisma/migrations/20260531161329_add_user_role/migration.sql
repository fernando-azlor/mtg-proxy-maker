-- CreateEnum
CREATE TYPE "Role" AS ENUM ('CLIENT', 'PREMIUM');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "Role" NOT NULL DEFAULT 'CLIENT';
