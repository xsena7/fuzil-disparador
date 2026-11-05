-- CreateTable
CREATE TABLE "InstagramPost" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "title" TEXT,
    "caption" TEXT NOT NULL,
    "images" TEXT[],
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
    "igMediaId" TEXT,
    "permalink" TEXT,
    "error" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InstagramPost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InstagramPost_status_scheduledAt_idx" ON "InstagramPost"("status", "scheduledAt");

