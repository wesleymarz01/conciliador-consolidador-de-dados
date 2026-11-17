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
  const head = (data[0] ?? []).map((h, i) => String(h ?? "").trim() || `Coluna ${i + 1}`);
  const seen = new Map<string, number>();
  const cols = head.map((h) => {
    const n = (seen.get(h) ?? 0) + 1;
    seen.set(h, n);
    return n > 1 ? `${h}_${n}` : h;
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
    return { name: file.name, ...matrixToRows(r.data, skip), skip };
  }
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const names = wb.SheetNames;
  const read = (n: string) =>
    XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[n]!, { header: 1, defval: "", raw: false });
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

/** Uni\u00e3o ordenada das colunas de todas as linhas (ordem de primeira apari\u00e7\u00e3o). */
export function columnsOf(rows: Record<string, unknown>[]): string[] {
  const cols = new Set<string>();
  for (const r of rows) for (const c of Object.keys(r)) cols.add(c);
  return [...cols];
}

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
    const csv = Papa.unparse(rows, { columns });
    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${name}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }
}
