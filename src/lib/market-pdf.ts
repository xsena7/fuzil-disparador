import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

// PDF que vai junto com a compra: como aceitar o convite, conectar no Fuzil e disparar (e o gerador de links para outras plataformas).

const ORANGE = rgb(0.976, 0.451, 0.086);
const INK = rgb(0.09, 0.09, 0.106);
const GRAY = rgb(0.32, 0.32, 0.36);

type Block = { kind: "h1" | "h2" | "p" | "step" | "note"; text: string; n?: number };

export function guideBlocks(opts: { appUrl: string; siteUrl: string; withTemplate: boolean }): Block[] {
  const b: Block[] = [
    { kind: "h1", text: "Sua BM chegou. Veja como disparar." },
    { kind: "p", text: "Este guia mostra o caminho completo: aceitar o convite da BM, conectar no Fuzil e fazer o primeiro disparo. São uns 10 minutos." },
    { kind: "h2", text: "1. Aceite o convite da BM" },
    { kind: "step", n: 1, text: "Abra o link do convite que veio no e-mail (um link por BM), já logado no Facebook que vai ser dono da BM." },
    { kind: "step", n: 2, text: "Clique em aceitar e siga as telas da Meta até o fim. A BM passa a aparecer em business.facebook.com." },
    { kind: "note", text: "O convite é único: depois de aceito, ele não funciona para outra pessoa. Não repasse o link." },
    { kind: "h2", text: "2. Entre no Fuzil" },
    { kind: "step", n: 1, text: `Crie sua senha pelo botão do e-mail (ou entre em ${opts.appUrl.replace(/^https?:\/\//, "")} se já tem conta).` },
    { kind: "step", n: 2, text: "Vá em Conexões e clique em Conectar Cloud API." },
    { kind: "step", n: 3, text: "Na janela da Meta, entre com o Facebook dono da BM, escolha a BM, a conta do WhatsApp e o número, e clique em Concluir." },
    { kind: "step", n: 4, text: "Não feche a página: espere aparecer \"BM conectada!\". Pronto, a BM está no Fuzil." },
  ];
  if (opts.withTemplate)
    b.push(
      { kind: "h2", text: "3. O template já vem aprovado" },
      { kind: "p", text: "A BM já tem um template de utilidade aprovado pela Meta, com botão de link. No Fuzil ele aparece em Templates assim que a BM conecta. O link do botão funciona dentro do Fuzil: cada pessoa recebe um link próprio e o painel conta os cliques." },
    );
  b.push(
    { kind: "h2", text: `${opts.withTemplate ? 4 : 3}. Faça o primeiro disparo` },
    { kind: "step", n: 1, text: "Em Grupos de BM, coloque a BM num grupo (ou use o grupo Prontas para disparo, que se preenche sozinho)." },
    { kind: "step", n: 2, text: "Em Campanhas, clique em Nova campanha e suba a planilha (Excel ou CSV) com os números." },
    { kind: "step", n: 3, text: "Escolha o template e o grupo, preencha as variáveis e cole o site de destino do botão." },
    { kind: "step", n: 4, text: "Clique em Enviar teste para conferir no seu WhatsApp. Depois, Iniciar disparo ou Agendar (horário de Brasília)." },
    { kind: "note", text: "Comece devagar: BM nova tem limite de pessoas por dia. O Fuzil mostra o limite e pausa sozinho quando bate, continuando quando libera." },
    { kind: "h2", text: "Quer disparar por outra plataforma?" },
    { kind: "p", text: `Use o gerador de links do Fuzil: entre em ${opts.siteUrl.replace(/^https?:\/\//, "")}/links com seu WhatsApp, crie um link com o seu site de destino e coloque o código dele fixo na variável do botão do template. O redirecionamento funciona em qualquer plataforma.` },
    { kind: "h2", text: "Garantia e suporte" },
    { kind: "p", text: "Você tem 24 horas depois da compra para avisar se tiver problema, e a gente responde em até 24 horas. Trocamos a BM em dois casos: o link do convite não funcionou ou a conta chegou banida. Fale com a gente pelo botão de WhatsApp do e-mail." },
  );
  return b;
}

/** Quebra o texto em linhas que cabem na largura. */
function wrap(text: string, font: PDFFont, size: number, width: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(/\s+/)) {
    const next = cur ? `${cur} ${word}` : word;
    if (font.widthOfTextAtSize(next, size) > width && cur) {
      lines.push(cur);
      cur = word;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines;
}

// As fontes padrão do PDF não têm emoji nem alguns símbolos: troca pelo mais parecido
const safe = (s: string) => s.replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/[–—]/g, "-").replace(/[^\x20-\x7E -ÿ]/g, "");

export async function buildGuidePdf(opts: { buyerName: string; appUrl: string; siteUrl: string; withTemplate: boolean }): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Fuzil Disparador - como disparar com sua BM");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595;
  const H = 842;
  const M = 56;
  let page: PDFPage = pdf.addPage([W, H]);
  let y = H - M;

  // Cabeçalho
  page.drawRectangle({ x: 0, y: H - 110, width: W, height: 110, color: INK });
  page.drawRectangle({ x: 0, y: H - 114, width: W, height: 4, color: ORANGE });
  page.drawText("FUZIL DISPARADOR", { x: M, y: H - 60, size: 22, font: bold, color: ORANGE });
  page.drawText(safe(`Guia de uso para ${opts.buyerName}`), { x: M, y: H - 86, size: 11, font: regular, color: rgb(0.85, 0.85, 0.88) });
  y = H - 150;

  const ensure = (h: number) => {
    if (y - h < M) {
      page = pdf.addPage([W, H]);
      y = H - M;
    }
  };

  for (const blk of guideBlocks(opts)) {
    const text = safe(blk.text);
    if (blk.kind === "h1") {
      for (const l of wrap(text, bold, 18, W - 2 * M)) {
        ensure(26);
        page.drawText(l, { x: M, y, size: 18, font: bold, color: INK });
        y -= 26;
      }
      y -= 4;
    } else if (blk.kind === "h2") {
      y -= 10;
      ensure(24);
      page.drawText(text, { x: M, y, size: 13, font: bold, color: ORANGE });
      y -= 22;
    } else if (blk.kind === "step") {
      const lines = wrap(text, regular, 10.5, W - 2 * M - 26);
      ensure(lines.length * 15 + 6);
      page.drawCircle({ x: M + 8, y: y + 3.5, size: 8, color: INK });
      page.drawText(String(blk.n ?? ""), { x: M + 5.2, y: y, size: 9, font: bold, color: rgb(1, 1, 1) });
      for (const l of lines) {
        page.drawText(l, { x: M + 26, y, size: 10.5, font: regular, color: GRAY });
        y -= 15;
      }
      y -= 6;
    } else {
      const isNote = blk.kind === "note";
      const lines = wrap(text, regular, 10.5, W - 2 * M - (isNote ? 20 : 0));
      ensure(lines.length * 15 + (isNote ? 18 : 8));
      if (isNote) page.drawRectangle({ x: M, y: y - lines.length * 15 + 6, width: W - 2 * M, height: lines.length * 15 + 10, color: rgb(1, 0.96, 0.92) });
      for (const l of lines) {
        page.drawText(l, { x: M + (isNote ? 10 : 0), y, size: 10.5, font: regular, color: isNote ? rgb(0.6, 0.27, 0.05) : GRAY });
        y -= 15;
      }
      y -= isNote ? 14 : 8;
    }
  }
  return Buffer.from(await pdf.save());
}
