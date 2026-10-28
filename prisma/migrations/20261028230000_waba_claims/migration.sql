-- CreateTable
CREATE TABLE "WabaClaim" (
    "wabaId" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WabaClaim_pkey" PRIMARY KEY ("wabaId")
);


-- As WABAs que já estão conectadas ficam com a conta onde estão
INSERT INTO "WabaClaim" ("wabaId", "workspaceId") SELECT DISTINCT ON ("wabaId") "wabaId", "workspaceId" FROM "WhatsAppAccount" ORDER BY "wabaId", "createdAt" ON CONFLICT DO NOTHING;
