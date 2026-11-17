/** Caracterização da exportação CSV (ambiente jsdom; download interceptado). */
import { afterEach, describe, expect, it, vi } from "vitest";
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
