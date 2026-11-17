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
