import { NextResponse } from "next/server";
import { getAuth } from "@/lib/auth";
import { encrypt } from "@/lib/crypto";
import { env } from "@/lib/env";
import { meta } from "@/lib/meta";
import { connectWaba } from "@/lib/sync";
import { deployBlueprints } from "@/lib/blueprints";
import { prisma } from "@/lib/db";

/** Recebe o resultado do Embedded Signup (Cloud API ou Coexistência) e conecta a WABA. */
export async function POST(req: Request) {
  const auth = await getAuth();
  if (!auth) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  const body = (await req.json()) as { code?: string; wabaId?: string; phoneNumberId?: string; type?: "CLOUD_API" | "COEXISTENCE" };
  if (!body.code || !body.wabaId) return NextResponse.json({ error: "Dados do cadastro incompletos" }, { status: 400 });

  try {
    const token = await meta.exchangeCode(body.code);
    const type = body.type === "COEXISTENCE" ? "COEXISTENCE" : "CLOUD_API";
    const waba = await connectWaba({ workspaceId: auth.workspace.id, wabaId: body.wabaId, accessTokenEnc: encrypt(token), connectionType: type });

    // Cloud API: o número precisa ser registrado. Na coexistência, o número já está ativo no app.
    if (type === "CLOUD_API" && body.phoneNumberId) {
      try {
        await meta.registerPhone(token, body.phoneNumberId, env.metaRegisterPin());
      } catch (err) {
        console.warn("[embedded-signup] registro do número falhou", err);
      }
    }
    if (body.phoneNumberId) {
      await prisma.phoneNumber.updateMany({ where: { phoneNumberId: body.phoneNumberId }, data: { isCoexistence: type === "COEXISTENCE" } });
    }
    deployBlueprints(auth.workspace.id).catch(() => undefined);
    return NextResponse.json({ ok: true, wabaId: waba.id });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : String(err) }, { status: 400 });
  }
}
