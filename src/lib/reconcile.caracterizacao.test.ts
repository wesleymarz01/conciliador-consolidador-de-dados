/**
 * Testes de caracterização do motor (dados fictícios).
 * - `it` fixa o comportamento atual que deve ser preservado.
 * - `it.fails` documenta um defeito conhecido (ver docs/AUDITORIA-TECNICA.md): o teste
 *   descreve o comportamento CORRETO e hoje falha. Ao corrigir o defeito, troca-se para `it`.
 */
import { describe, expect, it } from "vitest";
import { reconcile, stripDomain, valuesEqual, normalize, suggestPairs } from "./reconcile";

const o = { ignoreCase: true, trim: true };
const soma = (r: ReturnType<typeof reconcile>) =>
  r.identical.length + r.divergent.length + r.onlyA.length;

describe("normalização e equivalência de valores", () => {
  it("ignora maiúsculas e espaços extras conforme opções", () => {
    expect(normalize("  Srv  01 ", o)).toBe("srv 01");
    expect(normalize("  Srv  01 ", { ignoreCase: false, trim: false })).toBe("  Srv  01 ");
  });
  it("equivalência numérica BR/US em valores", () => {
    expect(valuesEqual("10,00", "10", o)).toBe(true);
    expect(valuesEqual("1.000", "1000", o)).toBe(true);
    expect(valuesEqual("1.234,56", "1234.56", o)).toBe(true);
    expect(valuesEqual("007", "7", o)).toBe(true);
    expect(valuesEqual("10", "11", o)).toBe(false);
  });
  it("sem 'ignorar maiúsculas', R$ é removido", () => {
    expect(valuesEqual("R$ 1.234,56", "1234.56", { ignoreCase: false, trim: true })).toBe(true);
  });
  it("[A1] com 'ignorar maiúsculas' (padrão), R$ também é removido", () => {
    expect(valuesEqual("R$ 1.234,56", "1234.56", o)).toBe(true);
  });
});

describe("[A1] valores monetários", () => {
  it("R$ em qualquer caixa, com sinal e espaços", () => {
    expect(valuesEqual("r$ 10,50", "10.5", o)).toBe(true);
    expect(valuesEqual("-R$ 1.234,56", "-1234.56", o)).toBe(true);
    expect(valuesEqual("R$ -1.234,56", "-1234,56", o)).toBe(true);
    expect(valuesEqual("$ 1,234.50", "1234.5", o)).toBe(true);
    expect(valuesEqual("R$ 10,00", "R$ 10,01", o)).toBe(false);
  });
  it("letra R solta não é ignorada", () => {
    expect(valuesEqual("1R2", "12", { ignoreCase: false, trim: true })).toBe(false);
  });
});

describe("stripDomain", () => {
  it("remove domínio de hostnames e preserva IPv4", () => {
    expect(stripDomain("srv01.corp.local")).toBe("srv01");
    expect(stripDomain("srv02.hml")).toBe("srv02");
    expect(stripDomain("10.0.0.1")).toBe("10.0.0.1");
    expect(stripDomain("srv03")).toBe("srv03");
  });
  it("[C1] aceita FQDN com ponto final, maiúsculas, hífen e sublinhado", () => {
    expect(stripDomain("srv01.corp.local.")).toBe("srv01");
    expect(stripDomain("SRV-APP_01.Empresa.Local")).toBe("SRV-APP_01");
    expect(stripDomain("1srv.dominio")).toBe("1srv");
  });
  it("[C1] preserva versões, decimais, códigos e IPv6", () => {
    for (const v of ["v1.2.3", "1.5", "ABC.123", "fe80::1", "srv 01.corp", "a..b"])
      expect(stripDomain(v)).toBe(v);
  });
  it("[C1] não trunca CPF", () => {
    expect(stripDomain("123.456.789-00")).toBe("123.456.789-00");
  });
  it("[C1] não trunca CNPJ", () => {
    expect(stripDomain("12.345.678/0001-90")).toBe("12.345.678/0001-90");
  });
  it("[C1] não trunca e-mail", () => {
    expect(stripDomain("joao.silva@exemplo.com")).toBe("joao.silva@exemplo.com");
  });
  it("[C1] não trunca IP com porta", () => {
    expect(stripDomain("10.0.0.1:8080")).toBe("10.0.0.1:8080");
  });
  it("[C1] CPFs diferentes não casam no inventário", () => {
    const r = reconcile(
      [{ c: "123.456.789-00" }],
      [{ c: "123.999.999-99" }],
      [{ a: "c", b: "c" }],
      [],
      { ...o, stripDomain: true },
    );
    expect(r.identical).toHaveLength(0);
  });
});

describe("cruzamento exato", () => {
  it("chave composta", () => {
    const r = reconcile(
      [
        { f: "1", s: "A" },
        { f: "1", s: "B" },
      ],
      [{ F: "1", S: "a" }],
      [
        { a: "f", b: "F" },
        { a: "s", b: "S" },
      ],
      [],
      o,
    );
    expect(r.identical).toHaveLength(1);
    expect(r.onlyA).toHaveLength(1);
  });
  it("chave numérica não usa equivalência (007 ≠ 7)", () => {
    const r = reconcile([{ k: "007" }], [{ k: "7" }], [{ a: "k", b: "k" }], [], o);
    expect(r.identical).toHaveLength(0);
  });
  it("[C2] chaves vazias não casam entre si e ficam em emptyA/emptyB", () => {
    const r = reconcile(
      [{ id: "" }, { id: " " }, { id: "1" }],
      [{ ID: "" }, { ID: "1" }],
      [{ a: "id", b: "ID" }],
      [],
      o,
    );
    expect(r.identical).toHaveLength(1);
    expect(r.emptyA).toHaveLength(2);
    expect(r.emptyB).toHaveLength(1);
  });
  it("[C2] chave composta só é vazia se todas as partes forem vazias", () => {
    const k = [
      { a: "h", b: "h" },
      { a: "ip", b: "ip" },
    ];
    const r = reconcile([{ h: "srv1", ip: "" }], [{ h: "srv1", ip: "" }], k, [], o);
    expect(r.identical).toHaveLength(1);
    expect(r.emptyA).toHaveLength(0);
  });
  it("[C2] duplicatas: vale a 1ª ocorrência; demais em dupA/dupB", () => {
    const r = reconcile(
      [
        { id: "1", v: "a" },
        { id: "1", v: "b" },
      ],
      [
        { ID: "1", v: "a" },
        { ID: "1", v: "b" },
        { ID: "2", v: "x" },
      ],
      [{ a: "id", b: "ID" }],
      [{ a: "v", b: "v" }],
      o,
    );
    expect(r.identical.map((m) => m.a["v"])).toEqual(["a"]);
    expect(r.divergent).toHaveLength(0);
    expect(r.dupA.map((x) => x["v"])).toEqual(["b"]);
    expect(r.dupB.map((x) => x["v"])).toEqual(["b"]);
    expect(r.onlyB.map((x) => x["ID"])).toEqual(["2"]);
  });
  it("[C2] duplicata detectada após normalização e remoção de domínio", () => {
    const r = reconcile(
      [{ h: "SRV01.corp.local" }, { h: "srv01" }],
      [{ h: "srv01" }],
      [{ a: "h", b: "h" }],
      [],
      { ...o, stripDomain: true },
    );
    expect(r.identical).toHaveLength(1);
    expect(r.dupA).toHaveLength(1);
  });
});

describe("[C2] invariante: toda linha aparece em exatamente uma categoria", () => {
  const casos = [
    { nome: "exato", fuzzy: undefined },
    { nome: "aproximado", fuzzy: 75 },
  ];
  for (const { nome, fuzzy } of casos)
    it(`modo ${nome}`, () => {
      const A = ["1", "1", "", "2", "PED-1003", "x"].map((id) => ({ id }));
      const B = ["1", "", "", "2", "2", "PED-1009", "y"].map((id) => ({ ID: id }));
      const r = reconcile(A, B, [{ a: "id", b: "ID" }], [], { ...o, fuzzy });
      expect(soma(r) + r.dupA.length + r.emptyA.length).toBe(r.totalA);
      const pares = r.identical.concat(r.divergent);
      const bUsadas = new Set(pares.map((m) => m.b)).size;
      expect(bUsadas + r.onlyB.length + r.dupB.length + r.emptyB.length).toBe(r.totalB);
    });
});

describe("sugestão de pares", () => {
  it("casa nomes iguais ignorando maiúsculas e espaços", () => {
    expect(suggestPairs(["ID", "Valor ", "X"], ["id", "valor", "Y"])).toEqual([
      { a: "ID", b: "id" },
      { a: "Valor ", b: "valor" },
    ]);
  });
});
