-- CreateTable
CREATE TABLE "SpaceNote" (
    "id" TEXT NOT NULL,
    "spaceId" TEXT NOT NULL,
    "body" TEXT NOT NULL DEFAULT '',
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpaceNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SpaceNote_spaceId_key" ON "SpaceNote"("spaceId");

-- CreateIndex
CREATE INDEX "SpaceNote_updatedById_idx" ON "SpaceNote"("updatedById");

-- AddForeignKey
ALTER TABLE "SpaceNote" ADD CONSTRAINT "SpaceNote_spaceId_fkey" FOREIGN KEY ("spaceId") REFERENCES "Space"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpaceNote" ADD CONSTRAINT "SpaceNote_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
