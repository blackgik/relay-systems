-- AlterTable
ALTER TABLE "Leg" ADD COLUMN     "acceptedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Review" (
    "id" TEXT NOT NULL,
    "legId" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "about" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "outcome" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Review_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Review_subjectId_about_createdAt_idx" ON "Review"("subjectId", "about", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Review_legId_about_key" ON "Review"("legId", "about");

-- AddForeignKey
ALTER TABLE "Review" ADD CONSTRAINT "Review_legId_fkey" FOREIGN KEY ("legId") REFERENCES "Leg"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
