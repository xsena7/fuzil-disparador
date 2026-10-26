import { test } from "node:test";
import assert from "node:assert/strict";
import { checkInviteLink, findBmName, findInviteUrl, normalizeBmName, parseInviteEmail } from "./market-invite";

test("acha o link do convite e ignora links de ajuda/descadastro", () => {
  const html = `<a href="https://www.facebook.com/help/123">Ajuda</a>
    <a href="https://business.facebook.com/invitation/?token=AbC123_x-9&amp;ref=email">Aceitar convite</a>
    <a href="https://www.facebook.com/email_unsubscribe?x=1">Descadastrar</a>`;
  assert.equal(findInviteUrl(html), "https://business.facebook.com/invitation/?token=AbC123_x-9&ref=email");
});

test("sem link de convite: null", () => {
  assert.equal(findInviteUrl("Olá, veja https://www.facebook.com/help/123 e https://exemplo.com"), null);
});

test("nome da BM no assunto, em português e inglês", () => {
  assert.equal(findBmName("João Silva convidou você para participar de Loja Azul Ltda no Meta Business Suite"), "Loja Azul Ltda");
  assert.equal(findBmName("Você foi convidado para acessar o portfólio empresarial Med Watt no Gerenciador de Negócios"), "Med Watt");
  assert.equal(findBmName('John invited you to join "Br Farma - Fuzil" on Meta Business Suite'), "Br Farma - Fuzil");
  assert.equal(findBmName("Assunto qualquer"), null);
});

test("nome normalizado ignora acento, caixa e pontuação", () => {
  assert.equal(normalizeBmName("  Colégio de Presidente   Epitácio! "), normalizeBmName("colegio de presidente epitacio"));
});

test("parseInviteEmail junta assunto e corpo", () => {
  const r = parseInviteEmail({
    subject: "Ana convidou você para participar de Ts Vitoria Holding no Meta Business Suite",
    text: "Clique para aceitar: https://business.facebook.com/invitation/?token=ZZZ",
  });
  assert.deepEqual(r, { url: "https://business.facebook.com/invitation/?token=ZZZ", bmName: "Ts Vitoria Holding" });
});

const fakeFetch = (status: number, body: string) => (async () => new Response(body, { status })) as unknown as typeof fetch;

test("teste do link: expirado, ok e fora do ar", async () => {
  assert.equal((await checkInviteLink("https://business.facebook.com/invitation/?token=1", fakeFetch(200, "<title>Convite</title><p>Este convite expirou.</p>"))).check, "INVALID");
  assert.equal((await checkInviteLink("https://business.facebook.com/invitation/?token=1", fakeFetch(200, "<title>Facebook</title><p>Entre para continuar</p><script>var invalid=1</script>"))).check, "OK");
  assert.equal((await checkInviteLink("https://business.facebook.com/invitation/?token=1", fakeFetch(404, "nada"))).check, "INVALID");
  assert.equal((await checkInviteLink("https://business.facebook.com/invitation/?token=1", fakeFetch(503, "fora"))).check, "UNKNOWN");
});

test("e-mail de convite no formato da Meta (assunto codificado, HTML quoted-printable)", async () => {
  const { simpleParser } = await import("mailparser");
  const raw = [
    "From: Meta for Business <notification@facebookmail.com>",
    "To: estoque@fuzildisparador.com.br",
    "Subject: =?UTF-8?Q?Jo=C3=A3o_convidou_voc=C3=AA_para_participar_de_Col=C3=A9gio_Azul_no_Meta_Business_Suite?=",
    "Message-ID: <abc123@facebookmail.com>",
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: quoted-printable",
    "",
    '<p>Voc=C3=AA foi convidado.</p><a href=3D"https://business.facebook.com/invitation/?token=3D=',
    'AbCdEf123&amp;ref=3Demail_invite">Aceitar convite</a> <a href=3D"https://www.facebook.com/help/123">Ajuda</a>',
  ].join("\r\n");
  const m = await simpleParser(raw);
  const r = parseInviteEmail({ subject: m.subject ?? "", text: m.text, html: typeof m.html === "string" ? m.html : null });
  assert.deepEqual(r, { url: "https://business.facebook.com/invitation/?token=AbCdEf123&ref=email_invite", bmName: "Colégio Azul" });
});

test("e-mail atual da Meta: nome do portfólio e link do botão", () => {
  const html = `<p><b>Dany Silva</b> convidou você para participar do portfólio empresarial de <b>Autoposto Tanque Cheio</b>. Os portfólios conectam as Páginas.</p>
    <p>Esse convite expirará em November 24, 2026.</p>
    <a href="https://business.facebook.com/invitation/?token=TK123&amp;ref=biz_invite_email" style="color:#fff"><span>Faça login para ver o convite</span></a>
    <a href="https://www.facebook.com/business/help/1234">Saiba mais</a>`;
  const r = parseInviteEmail({
    subject: "Ação necessária: você recebeu um convite para participar do portfólio empresarial Autoposto Tanque Cheio",
    text: null,
    html,
  });
  assert.deepEqual(r, { url: "https://business.facebook.com/invitation/?token=TK123&ref=biz_invite_email", bmName: "Autoposto Tanque Cheio" });
});

test("botão com link de redirecionamento do Facebook também vale", () => {
  const html = `<a href="https://www.facebook.com/n/?business%2Finvitation%2F&amp;token=AB&amp;aref=1">Aceitar convite</a>`;
  assert.equal(parseInviteEmail({ subject: "x", html }).url, "https://www.facebook.com/n/?business%2Finvitation%2F&token=AB&aref=1");
});

test("'expirará em' na página não marca o convite como vencido", async () => {
  const f = (async () => new Response("<p>Esse convite expirará em 24 de novembro</p>", { status: 200 })) as unknown as typeof fetch;
  assert.equal((await checkInviteLink("https://business.facebook.com/invitation/?token=1", f)).check, "OK");
});
