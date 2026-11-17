/** Caracterização da exportação CSV (ambiente jsdom; download interceptado). */
import { afterEach, describe, expect, it, vi } from "vitest";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { columnsOf, exportRows } from "./files";

async function captureCsv(rows: Record<string, unknown>[]): Promise<string> {
  let blob: Blob | undefined;
  const url = URL as unknown as Record<string, unknown>;
  url["createObjectURL"] = vi.fn((b: Blob) => ((blob = b), "blob:teste"));
  url["revokeObjectURL"] = vi.fn();
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  exportRows(rows, "teste", "csv");
  expect(click).toHaveBeenCalled();
  return await new Promise<string>((res) => {
    const fr = new FileReader();
    fr.onload = () =>
      res(new TextDecoder("utf-8", { ignoreBOM: true }).decode(fr.result as ArrayBuffer));
    fr.readAsArrayBuffer(blob!);
  });
}

describe("exportRows — CSV", () => {
  afterEach(() => vi.restoreAllMocks());
  it("gera CSV UTF-8 com BOM", async () => {
    const csv = await captureCsv([{ id: "1", nome: "Ação" }]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv.slice(1).split(/\r?\n/)).toEqual(["id,nome", "1,Ação"]);
  });
  it("[A2] inclui colunas que não aparecem na primeira linha", async () => {
    const csv = await captureCsv([
      { "Match Status": "Não Encontrado", X: "1" },
      { "Match Status": "Encontrado", X: "2", Y: "b" },
    ]);
    expect(csv.slice(1).split(/\r?\n/)[0]).toBe("Match Status,X,Y");
  });
});

describe("columnsOf", () => {
  it("[A2] une colunas na ordem de primeira aparição", () => {
    expect(columnsOf([{ a: 1 }, { b: 2, a: 3 }, { c: 4 }])).toEqual(["a", "b", "c"]);
    expect(columnsOf([])).toEqual([]);
  });
  it("[A2] linhas sem a coluna saem vazias no CSV", async () => {
    const csv = await captureCsv([{ X: "1" }, { X: "2", Y: "b" }]);
    expect(csv.slice(1).split(/\r?\n/)).toEqual(["X,Y", "1,", "2,b"]);
  });
});

/** Lê o CSV exportado (sem BOM) de volta para valores de célula. */
const cellsOf = async (rows: Record<string, unknown>[]) =>
  Papa.parse<string[]>((await captureCsv(rows)).slice(1)).data;

describe("[M7] exportação CSV protegida contra injeção de fórmulas", () => {
  afterEach(() => vi.restoreAllMocks());

  const perigosos = [
    "=1+1",
    '=HYPERLINK("http://exemplo.invalid","clique")',
    "=cmd|' /C calc'!A0",
    "+1+1",
    "-2+3",
    "@SUM(A1:A2)",
    "\t=1+1",
    "\r=1+1",
    "＝1+1", // sinal de igual de largura total
  ];
  for (const v of perigosos)
    it(`neutraliza ${JSON.stringify(v)} com apóstrofo`, async () => {
      const [, linha] = await cellsOf([{ valor: v }]);
      expect(linha).toEqual([`'${v}`]);
    });

  it("neutraliza também o cabeçalho", async () => {
    const [cab] = await cellsOf([{ "=perigo": "x" }]);
    expect(cab).toEqual(["'=perigo"]);
  });

  it("preserva números negativos, positivos e decimais", async () => {
    const nums = ["-10", "-1.234,56", "+5", "-0,5", "-1e3", "-.5", "10", "-1,234.50"];
    const [, linha] = await cellsOf([Object.fromEntries(nums.map((n, i) => [`c${i}`, n]))]);
    expect(linha).toEqual(nums);
  });

  it("preserva acentos, aspas, separadores e quebras de linha", async () => {
    const v = 'Ação; "citação", vírgula\nnova linha — € ç';
    const [, linha] = await cellsOf([{ texto: v, sinal: "a-b", email: "ana@exemplo.com" }]);
    expect(linha).toEqual([v, "a-b", "ana@exemplo.com"]);
  });

  it("não altera texto que só contém o caractere no meio", async () => {
    const [, linha] = await cellsOf([{ v: "PED-1001", w: "1+1", x: "R$ -10,00" }]);
    expect(linha).toEqual(["PED-1001", "1+1", "R$ -10,00"]);
  });
});

describe("[M7] exportação XLSX", () => {
  it("valores iniciados por = são gravados como texto, não como fórmula", () => {
    const ws = XLSX.utils.json_to_sheet([{ a: "=1+1" }], { header: ["a"] });
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Resultado");
    const back = XLSX.read(XLSX.write(wb, { type: "array", bookType: "xlsx" }), { type: "array" });
    const cel = back.Sheets["Resultado"]!["A2"];
    expect(cel?.t).toBe("s");
    expect(cel?.f).toBeUndefined();
    expect(cel?.v).toBe("=1+1");
  });
});
