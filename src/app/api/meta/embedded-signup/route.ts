import { resetBmSecrets } from "@/lib/webhook";
import { NextResponse } from "next/server";
import { getActiveAuth } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { meta } from "@/lib/meta";
import { connectWaba } from "@/lib/sync";
import { deployBlueprints } from "@/lib/blueprints";
import { prisma } from "@/lib/db";

/** Recebe o resultado do Embedded Signup (Cloud API ou Coexistência) e conecta a WABA. */
export async function POST(req: Request) {
  const auth = await getActiveAuth();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = (await req.json()) as { code?: string; wabaId?: string; phoneNumberId?: string; type?: "CLOUD_API" | "COEXISTENCE" };
  if (!body.code) return NextResponse.json({ error: "Dados do cadastro incompletos" }, { status: 400 });

  try {
    const token = await meta.exchangeCode(body.code);
    const type = body.type === "COEXISTENCE" ? "COEXISTENCE" : "CLOUD_API";
    // Normalmente o waba_id vem do evento do cadastro; se não veio, descobre pelas permissões do token
    const wabaIds = body.wabaId ? [body.wabaId] : await meta.wabaIdsFromToken(token);
    if (!wabaIds.length) return NextResponse.json({ error: "A Meta não informou qual conta do WhatsApp foi escolhida. Tente conectar de novo." }, { status: 400 });
    let waba: Awaited<ReturnType<typeof connectWaba>> | null = null;
    // BM que já está conectada (app antigo, com o token e a chave dela) NÃO é trocada pelo app novo
    const already = await prisma.whatsAppAccount.findMany({ where: { workspaceId: auth.workspace.id, wabaId: { in: wabaIds } }, select: { wabaId: true } });
    const skipped = already.map((w) => w.wabaId);
    for (const wabaId of wabaIds.filter((id) => !skipped.includes(id))) waba = await connectWaba({ workspaceId: auth.workspace.id, wabaId, accessTokenEnc: encrypt(token), connectionType: type });
    // Contas novas pelo botão: recebem a chave secreta do app verificado (a chave padrão antiga é de outro app)
    const newIds = wabaIds.filter((id) => !skipped.includes(id));
    const newSecret = env.metaAppSecret();
    if (newIds.length && newSecret) {
      await prisma.whatsAppAccount.updateMany({ where: { workspaceId: auth.workspace.id, wabaId: { in: newIds } }, data: { appSecretEnc: encrypt(newSecret) } });
      resetBmSecrets();
    }
    if (!waba && skipped.length)
      return NextResponse.json({ error: "Essa conta do WhatsApp já está conectada no Fuzil (pelo app antigo). Ela continua funcionando como está." }, { status: 409 });

    // Cloud API: o número precisa ser registrado. Na coexistência, o número já está ativo no app.
    if (type === "CLOUD_API" && body.phoneNumberId) {
      try {
        await meta.registerPhone(token, body.phoneNumberId, env.metaRegisterPin());
      } catch (err) {
        console.warn("[embedded-signup] registro do número falhou", err);
      }
    }
    if (body.phoneNumberId) {
      await prisma.phoneNumber.updateMany({ where: { phoneNumberId: body.phoneNumberId, waba: { workspaceId: auth.workspace.id } }, data: { isCoexistence: type === "COEXISTENCE" } });
    }
    deployBlueprints(auth.workspace.id).catch(() => undefined);
    return NextResponse.json({ ok: true, wabaId: waba?.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
