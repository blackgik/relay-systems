-- AlterTable
ALTER TABLE "Leg" ADD COLUMN     "senderRating" INTEGER,
ADD COLUMN     "ratedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Attestation" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "shipmentId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "signedName" TEXT NOT NULL,
    "statementVersion" TEXT NOT NULL,
    "statementHash" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attestation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_reference_key" ON "Attestation"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Attestation_shipmentId_key" ON "Attestation"("shipmentId");

-- AddForeignKey
ALTER TABLE "Attestation" ADD CONSTRAINT "Attestation_shipmentId_fkey" FOREIGN KEY ("shipmentId") REFERENCES "Shipment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
