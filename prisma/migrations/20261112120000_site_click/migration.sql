-- CreateTable
CREATE TABLE "SiteClick" (
    "id" TEXT NOT NULL,
    "day" DATE NOT NULL,
    "page" TEXT NOT NULL,
    "button" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "SiteClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SiteClick_day_idx" ON "SiteClick"("day");

-- CreateIndex
CREATE UNIQUE INDEX "SiteClick_day_page_button_source_key" ON "SiteClick"("day", "page", "button", "source");

