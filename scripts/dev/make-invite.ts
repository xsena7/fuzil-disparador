import { prisma } from "../../src/lib/db";
import { createPasswordLink } from "../../src/lib/password-tokens";
(async () => {
  const u = await prisma.user.findUniqueOrThrow({ where: { email: process.argv[2] } });
  console.log(await createPasswordLink(u.id, "INVITE"));
  process.exit(0);
})();
