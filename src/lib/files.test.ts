// @vitest-environment node
/** Caracterização da leitura de arquivos (dados fictícios gerados em memória). */
import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { ALL_SHEETS, matrixToRows, parseFile } from "./files";

const csvFile = (txt: string, name = "base.csv") => new File([txt], name, { type: "text/csv" });
function xlsxFile(sheets: Record<string, unknown[][]>, name = "base.xlsx") {
  const wb = XLSX.utils.book_new();
  for (const [n, aoa] of Object.entries(sheets))
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), n);
  const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
  return new File([buf], name);
}

describe("parseFile — CSV", () => {
  it("lê CSV com vírgula", async () => {
    const s = await parseFile(csvFile("id,nome\n1,Ana\n2,Bruno\n"));
    expect(s.columns).toEqual(["id", "nome"]);
    expect(s.rows).toEqual([
      { id: "1", nome: "Ana" },
      { id: "2", nome: "Bruno" },
    ]);
  });
  it("detecta ponto e vírgula e preserva acentos UTF-8", async () => {
    const s = await parseFile(csvFile("Código;Descrição\nA1;Ação\n"));
    expect(s.columns).toEqual(["Código", "Descrição"]);
    expect(s.rows[0]).toEqual({ Código: "A1", Descrição: "Ação" });
  });
  it("pula linhas de título", async () => {
    const s = await parseFile(csvFile("Relatório fictício\n\nhost,so\nsrv01,Linux\n"), { skip: 1 });
    expect(s.columns).toEqual(["host", "so"]);
    expect(s.rows).toHaveLength(1);
  });
  it("remove espaços nas células e ignora linhas vazias", async () => {
    const s = await parseFile(csvFile("id,v\n 1 , x \n,\n"));
    expect(s.rows).toEqual([{ id: "1", v: "x" }]);
  });
});

describe("parseFile — XLSX", () => {
  const f = () =>
    xlsxFile({
      Jan: [
        ["id", "valor"],
        [1, 10.5],
        [2, 20],
      ],
      Fev: [
        ["id", "obs"],
        [3, "ok"],
      ],
    });
  it("lê a primeira aba por padrão e lista as abas", async () => {
    const s = await parseFile(f());
    expect(s.sheetNames).toEqual(["Jan", "Fev"]);
    expect(s.sheet).toBe("Jan");
    expect(s.rows).toEqual([
      { id: "1", valor: "10.5" },
      { id: "2", valor: "20" },
    ]);
  });
  it("lê uma aba específica", async () => {
    const s = await parseFile(f(), { sheet: "Fev" });
    expect(s.rows).toEqual([{ id: "3", obs: "ok" }]);
  });
  it("consolida todas as abas com Aba_Origem e união de colunas", async () => {
    const s = await parseFile(f(), { sheet: ALL_SHEETS });
    expect(s.columns).toEqual(["id", "valor", "obs", "Aba_Origem"]);
    expect(s.rows.map((r) => r["Aba_Origem"])).toEqual(["Jan", "Jan", "Fev"]);
  });
  it("erro para aba inexistente", async () => {
    await expect(parseFile(f(), { sheet: "Mar" })).rejects.toThrow("Aba não encontrada");
  });
});

describe("parseFile — formatos de célula e .xls (regressão da biblioteca xlsx)", () => {
  // Planilha fictícia com formatos numéricos e de data, acentos e célula mesclada.
  const sheet = () => {
    const ws: XLSX.WorkSheet = { "!ref": "A1:D3" };
    const put = (c: string, v: XLSX.CellObject) => (ws[c] = v);
    ["Código", "Valor", "Data", "Pct"].forEach((h, i) =>
      put(String.fromCharCode(65 + i) + "1", { t: "s", v: h }),
    );
    put("A2", { t: "s", v: "PED-1001" });
    put("B2", { t: "n", v: 1234.5, z: "#,##0.00" });
    put("C2", { t: "n", v: 45291, z: "dd/mm/yyyy" });
    put("D2", { t: "n", v: 0.125, z: "0.0%" });
    put("A3", { t: "s", v: "Ação ção" });
    put("B3", { t: "n", v: -10 });
    ws["!merges"] = [{ s: { r: 2, c: 2 }, e: { r: 2, c: 3 } }];
    return ws;
  };
  const book = (bookType: XLSX.BookType, name: string) => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, sheet(), "Formatos");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["id"], [1]]), "Segunda");
    return new File([XLSX.write(wb, { type: "array", bookType }) as ArrayBuffer], name);
  };
  const esperado = [
    { Código: "PED-1001", Valor: "1,234.50", Data: "31/12/2023", Pct: "12.5%" },
    { Código: "Ação ção", Valor: "-10", Data: "", Pct: "" },
  ];

  it("lê .xlsx com valores formatados como aparecem no Excel", async () => {
    const s = await parseFile(book("xlsx", "base.xlsx"));
    expect(s.rows).toEqual(esperado);
  });
  it("lê .xls (BIFF8) com os mesmos valores e abas", async () => {
    const s = await parseFile(book("biff8", "base.xls"));
    expect(s.sheetNames).toEqual(["Formatos", "Segunda"]);
    expect(s.rows).toEqual(esperado);
  });
});

describe("matrixToRows", () => {
  it("nomeia cabeçalhos vazios e desduplica repetidos", () => {
    const r = matrixToRows([
      ["a", "", "a"],
      ["1", "2", "3"],
    ]);
    expect(r.columns).toEqual(["a", "Coluna 2", "a_2"]);
  });
  it("hoje: remove colunas sem nenhum valor", () => {
    expect(
      matrixToRows([
        ["A", "B"],
        ["1", ""],
      ]).columns,
    ).toEqual(["A"]);
  });
});
