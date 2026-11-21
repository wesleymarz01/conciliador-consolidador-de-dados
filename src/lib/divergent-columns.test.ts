import { describe, it, expect } from "vitest";
import { divergentColumns } from "./reconcile";

describe("divergentColumns", () => {
  it("destaca a coluna de B mesmo com nome diferente do de A", () => {
    const s = divergentColumns(["valor"], [{ a: "valor", b: "Preço" }]);
    expect([...s].sort()).toEqual(["Preço (B)", "valor (A)"]);
  });
  it("mantém o comportamento quando os nomes são iguais", () => {
    expect([...divergentColumns(["v"], [{ a: "v", b: "v" }])].sort()).toEqual(["v (A)", "v (B)"]);
  });
  it("não destaca colunas de B cujo nome coincide com outro campo divergente de A", () => {
    const pairs = [
      { a: "X", b: "Y" },
      { a: "Y", b: "Z" },
    ];
    const s = divergentColumns(["Y"], pairs);
    expect(s.has("Y (B)")).toBe(false);
    expect([...s].sort()).toEqual(["Y (A)", "Z (B)"]);
  });
  it("retorna vazio sem divergências", () => {
    expect(divergentColumns([], [{ a: "a", b: "b" }]).size).toBe(0);
  });
});
