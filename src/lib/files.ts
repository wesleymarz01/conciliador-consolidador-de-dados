import * as XLSX from "xlsx";
import Papa from "papaparse";
import type { Row } from "./reconcile";

export const ALL_SHEETS = "__all__";
export interface Sheet {
  name: string;
  columns: string[];
  rows: Row[];
  sheetNames?: string[] | undefined;
  sheet?: string | undefined;
  skip?: number | undefined;
}
export interface ParseOpts {
  sheet?: string | undefined;
  skip?: number | undefined;
}

/** Converte matriz (linhas x colunas) em objetos, pulando linhas iniciais e removendo linhas/colunas vazias. */
export function matrixToRows(m: unknown[][], skip = 0): { columns: string[]; rows: Row[] } {
  const data = m.slice(skip).filter((r) => r.some((v) => String(v ?? "").trim() !== ""));
  // A largura é a da linha mais longa: no CSV, valores além do cabeçalho viram "Coluna N"
  // em vez de serem descartados (no Excel a matriz já vem com a largura da aba).
  const width = data.reduce((w, r) => Math.max(w, r.length), 0);
  const head = Array.from(
    { length: width },
    (_, i) => String(data[0]?.[i] ?? "").trim() || `Coluna ${i + 1}`,
  );
  // Repetidos recebem sufixo (_2, _3...) que não colide com nenhum cabeçalho real:
  // em "X, X, X_2" a segunda coluna vira "X_3", em vez de sobrescrever "X_2".
  const taken = new Set(head);
  const seen = new Set<string>();
  const cols = head.map((h) => {
    if (!seen.has(h)) {
      seen.add(h);
      return h;
    }
    let n = 2;
    while (taken.has(`${h}_${n}`)) n++;
    const name = `${h}_${n}`;
    taken.add(name);
    return name;
  });
  const rows = data
    .slice(1)
    .map((r) => Object.fromEntries(cols.map((c, i) => [c, String(r[i] ?? "").trim()])));
  const used = cols.filter((c) => rows.some((r) => r[c] !== ""));
  return {
    columns: used,
    rows: rows.map((r) => Object.fromEntries(used.map((c) => [c, r[c] ?? ""]))),
  };
}

export async function parseFile(file: File, o: ParseOpts = {}): Promise<Sheet> {
  const skip = o.skip ?? 0;
  if (file.name.toLowerCase().endsWith(".csv")) {
    const r = Papa.parse<string[]>(await file.text(), { skipEmptyLines: true });
    // Aspas sem fechamento juntam linhas seguintes numa única célula: recusa em vez de
    // perder linhas sem aviso. Com outra aspa adiante, o PapaParse acusa InvalidQuotes.
    if (r.errors.some((e) => e.code === "MissingQuotes" || e.code === "InvalidQuotes"))
      throw new Error("CSV com aspas sem fechamento");
    return { name: file.name, ...matrixToRows(r.data, skip), skip };
  }
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const names = wb.SheetNames;
  const read = (n: string) => {
    const ws = wb.Sheets[n]!;
    // No formato Geral, inteiros longos viram "1.23457E+13" no texto formatado, e chaves
    // diferentes ficariam iguais. Para eles, usa o número completo.
    for (const [ref, c] of Object.entries(ws) as [string, XLSX.CellObject][])
      if (
        ref[0] !== "!" &&
        c.t === "n" &&
        (!c.z || c.z === "General") &&
        Number.isSafeInteger(c.v) &&
        /^-?\d+(\.\d+)?E[+-]\d+$/i.test(c.w ?? "")
      )
        c.w = String(c.v);
    return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "", raw: false });
  };
  const sheet = o.sheet ?? names[0] ?? "";
  if (sheet === ALL_SHEETS) {
    const cols: string[] = [];
    const rows: Row[] = [];
    for (const n of names) {
      const p = matrixToRows(read(n), skip);
      for (const c of p.columns) if (!cols.includes(c)) cols.push(c);
      for (const r of p.rows) rows.push({ ...r, Aba_Origem: n });
    }
    return {
      name: file.name,
      columns: [...cols, "Aba_Origem"],
      rows,
      sheetNames: names,
      sheet,
      skip,
    };
  }
  if (!wb.Sheets[sheet]) throw new Error("Aba não encontrada");
  return { name: file.name, ...matrixToRows(read(sheet), skip), sheetNames: names, sheet, skip };
}

/** União ordenada das colunas de todas as linhas (ordem de primeira aparição). */
export function columnsOf(rows: Record<string, unknown>[]): string[] {
  const cols = new Set<string>();
  for (const r of rows) for (const c of Object.keys(r)) cols.add(c);
  return [...cols];
}

/**
 * Valores que Excel e outros programas interpretariam como fórmula ao abrir um CSV
 * (CSV/Formula Injection): começam com = + - @, tabulação ou retorno de carro, inclusive
 * as variantes de largura total (＝ ＋ － ＠). Números simples como "-10" ou "+5" são
 * exceção e ficam intactos. No CSV exportado, esses valores recebem um apóstrofo no
 * início, como recomenda a OWASP.
 */
export const FORMULA_RISK =
  /^(?![+-]?(?:\d[\d.,]*|[.,]\d+)(?:[eE][+-]?\d+)?$)[=+\-@\t\r\uFF1D\uFF0B\uFF0D\uFF20]/;

export function exportRows(rows: Record<string, unknown>[], name: string, fmt: "xlsx" | "csv") {
  const columns = columnsOf(rows);
  if (fmt === "xlsx") {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(rows, { header: columns }),
      "Resultado",
    );
    XLSX.writeFile(wb, `${name}.xlsx`);
  } else {
    // No XLSX, valores assim já são gravados como texto (não como fórmula) pelo SheetJS.
    const csv = Papa.unparse(rows, { columns, escapeFormulae: FORMULA_RISK });
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
