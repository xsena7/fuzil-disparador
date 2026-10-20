import ExcelJS from "exceljs";
import Papa from "papaparse";

/** Extensões aceitas na audiência. */
export const AUDIENCE_EXTENSIONS = [".csv", ".txt", ".tsv", ".xlsx", ".xlsm"];

/**
 * Lê a planilha enviada (CSV/TXT/TSV ou Excel) e devolve o conteúdo como CSV, que é o que o leitor da audiência entende.
 * No Excel usa a primeira aba que tiver dados.
 */
export async function audienceFileToCsv(fileName: string, buf: Buffer): Promise<string> {
  const ext = fileName.toLowerCase().match(/\.[a-z0-9]+$/)?.[0] ?? "";
  const isZip = buf[0] === 0x50 && buf[1] === 0x4b; // .xlsx é um zip (começa com "PK")
  if (ext === ".xls" || ext === ".ods" || ext === ".numbers")
    throw new Error("Esse formato antigo não é aceito. No Excel, use Arquivo → Salvar como → Pasta de Trabalho do Excel (.xlsx) ou CSV.");
  if (ext === ".xlsx" || ext === ".xlsm" || isZip) {
    const wb = new ExcelJS.Workbook();
    await wb.xlsx.load(buf as unknown as ArrayBuffer);
    const sheet = wb.worksheets.find((w) => w.actualRowCount > 0);
    if (!sheet) throw new Error("A planilha está vazia.");
    const rows: string[][] = [];
    const width = sheet.actualColumnCount || sheet.columnCount;
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const cells: string[] = [];
      for (let c = 1; c <= width; c++) cells.push(row.getCell(c).text?.trim() ?? "");
      if (cells.some(Boolean)) rows.push(cells);
    });
    return Papa.unparse(rows);
  }
  // Texto: planilhas exportadas do Excel BR costumam vir em latin1
  let text = buf.toString("utf8");
  if (text.includes("�")) text = buf.toString("latin1");
  // TSV (tabulação) vira vírgula
  const first = text.split(/\r?\n/, 1)[0] ?? "";
  if ((first.match(/\t/g)?.length ?? 0) > Math.max(first.match(/;/g)?.length ?? 0, first.match(/,/g)?.length ?? 0)) {
    const parsed = Papa.parse<string[]>(text, { delimiter: "\t", skipEmptyLines: "greedy" });
    return Papa.unparse(parsed.data);
  }
  return text;
}
