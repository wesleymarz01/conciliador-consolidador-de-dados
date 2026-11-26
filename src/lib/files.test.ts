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
  it("não descarta valores além da largura do cabeçalho", async () => {
    const s = await parseFile(csvFile("a,b\n1,2,3\n4,5\n"));
    expect(s.columns).toEqual(["a", "b", "Coluna 3"]);
    expect(s.rows).toEqual([
      { a: "1", b: "2", "Coluna 3": "3" },
      { a: "4", b: "5", "Coluna 3": "" },
    ]);
  });
  it("recusa CSV com aspas sem fechamento em vez de perder linhas", async () => {
    await expect(parseFile(csvFile('id,nome\n1,"Ana\n2,Bruno\n3,Caio\n'))).rejects.toThrow(
      "aspas sem fechamento",
    );
  });
  it("recusa aspa sem fechamento seguida de campo entre aspas", async () => {
    await expect(parseFile(csvFile('id,nome\n1,"Ana\n2,Bruno\n3,"Caio"\n'))).rejects.toThrow(
      "aspas sem fechamento",
    );
  });
  it("aceita campos entre aspas válidos (vírgula, aspas escapadas e quebra de linha)", async () => {
    const s = await parseFile(csvFile('id,nome\n1,"Silva, Ana"\n2,"Bruno ""B"""\n3,"Caio\nC"\n'));
    expect(s.rows).toEqual([
      { id: "1", nome: "Silva, Ana" },
      { id: "2", nome: 'Bruno "B"' },
      { id: "3", nome: "Caio\nC" },
    ]);
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
  it("lê inteiros longos no formato Geral sem notação científica", async () => {
    const s = await parseFile(
      xlsxFile({
        S: [
          ["id", "v"],
          [12345678901234, 1.5],
          [12345678901235, 2],
        ],
      }),
    );
    expect(s.rows).toEqual([
      { id: "12345678901234", v: "1.5" },
      { id: "12345678901235", v: "2" },
    ]);
  });
  it("mantém datas com nome de mês (d-mmm-yy, mmm-yy) como data", async () => {
    const ws = XLSX.utils.aoa_to_sheet([["d"], [44972], [44973]]);
    ws["A2"]!.z = "d-mmm-yy";
    ws["A3"]!.z = "mmm-yy";
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "S");
    const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as ArrayBuffer;
    const s = await parseFile(new File([buf], "datas.xlsx"));
    expect(s.rows).toEqual([{ d: "15-Feb-23" }, { d: "Feb-23" }]);
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
  it("sufixo de repetido não colide com cabeçalho existente (X, X, X_2)", () => {
    const r = matrixToRows([
      ["X", "X", "X_2"],
      ["1", "2", "3"],
    ]);
    expect(r.columns).toEqual(["X", "X_3", "X_2"]);
    expect(r.rows).toEqual([{ X: "1", X_3: "2", X_2: "3" }]);
  });
  it("sufixo de repetido não colide com nome gerado para cabeçalho vazio", () => {
    const r = matrixToRows([
      ["Coluna 2", "", "Coluna 2"],
      ["1", "2", "3"],
    ]);
    expect(new Set(r.columns).size).toBe(3);
    expect(Object.values(r.rows[0]!)).toEqual(["1", "2", "3"]);
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
