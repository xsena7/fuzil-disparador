import { prisma } from "../../src/lib/db";
import { connectWaba } from "../../src/lib/sync";
(async () => {
  const ws = await prisma.workspace.findFirstOrThrow();
  const w = await connectWaba({ workspaceId: ws.id, wabaId: "1002", accessTokenEnc: null, connectionType: "MANUAL" });
  const after = await prisma.whatsAppAccount.findUniqueOrThrow({ where: { id: w.id }, include: { phones: true } });
  console.log("webhookSubscribed:", after.webhookSubscribed, "| numeros:", after.phones.length);
  process.exit(0);
})();
