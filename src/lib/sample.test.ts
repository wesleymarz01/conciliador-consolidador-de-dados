import { describe, expect, it } from "vitest";
import { reconcile } from "./reconcile";
import { sample } from "./sample";

// Resultado "golden" dos dados de exemplo — qualquer mudança aqui precisa ser intencional
// e registrada no CHANGELOG.
describe("dados de exemplo (golden)", () => {
  const [A, B] = sample();
  const keys = [{ a: "Pedido", b: "Código Pedido" }];
  const cmp = [
    { a: "Valor", b: "Valor" },
    { a: "Status", b: "Status" },
  ];
  const o = { ignoreCase: true, trim: true };

  it("tamanhos das planilhas", () => {
    expect(A.rows).toHaveLength(54);
    expect(B.rows).toHaveLength(56);
  });
  it("modo auditoria", () => {
    const r = reconcile(A.rows, B.rows, keys, cmp, o);
    expect([r.identical.length, r.divergent.length, r.onlyA.length, r.onlyB.length]).toEqual([
      40, 10, 4, 6,
    ]);
    expect(r.divergent.map((m) => `${m.key}:${m.diffs.join("+")}`)).toMatchSnapshot();
  });
  it("modo inventário (sem campos comparados)", () => {
    const r = reconcile(A.rows, B.rows, keys, [], { ...o, stripDomain: true });
    expect([r.identical.length, r.divergent.length, r.onlyA.length, r.onlyB.length]).toEqual([
      50, 0, 4, 6,
    ]);
  });
});
