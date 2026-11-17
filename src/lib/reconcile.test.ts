import { similarity } from "./reconcile";
import { matrixToRows } from "./files";
import { describe, it, expect } from "vitest";
import { reconcile } from "./reconcile";

const o = { ignoreCase: true, trim: true };
describe("reconcile", () => {
  const A = [
    { id: "1", v: "10,00" },
    { id: "2", v: "5" },
    { id: "3", v: "7" },
  ];
  const B = [
    { ID: "1", val: "10" },
    { ID: "2", val: "6" },
    { ID: "4", val: "1" },
  ];
  const r = reconcile(A, B, [{ a: "id", b: "ID" }], [{ a: "v", b: "val" }], o);
  it("identical when values match (numeric)", () => expect(r.identical.length).toBe(1));
  it("divergent when values differ", () => expect(r.divergent[0]?.a["id"]).toBe("2"));
  it("only in A", () => expect(r.onlyA.map((x) => x["id"])).toEqual(["3"]));
  it("only in B", () => expect(r.onlyB.map((x) => x["ID"])).toEqual(["4"]));
});

import { reconcile as rc2 } from "./reconcile";
describe("modo inventário (hostname)", () => {
  it("encontra hostname em ambas ignorando domínio e maiúsculas", () => {
    const A = [{ Host: "SRV01.corp.local" }, { Host: "srv02" }, { Host: "prod9" }];
    const B = [{ hostname: "srv01" }, { hostname: "SRV02.hml" }, { hostname: "hml77" }];
    const r = rc2(A, B, [{ a: "Host", b: "hostname" }], [], {
      ignoreCase: true,
      trim: true,
      stripDomain: true,
    });
    expect(r.identical.length).toBe(2);
    expect(r.onlyB.map((x) => x["hostname"])).toEqual(["hml77"]);
    expect(r.onlyA.map((x) => x["Host"])).toEqual(["prod9"]);
  });
});

describe("melhorias do script do cliente", () => {
  it("pula linhas iniciais de título", () => {
    const r = matrixToRows([["Relatório TSM"], [""], ["Hostname", "SO"], ["srv01", "Linux"]], 1);
    expect(r.columns).toEqual(["Hostname", "SO"]);
    expect(r.rows).toEqual([{ Hostname: "srv01", SO: "Linux" }]);
  });
  it("modo aproximado casa srv_app_01 com srv-app-01 acima de 75%", () => {
    const o = { ignoreCase: true, trim: true, fuzzy: 75 };
    const r = rc2([{ h: "srv_app_01" }], [{ h: "srv-app-01" }], [{ a: "h", b: "h" }], [], o);
    expect(r.identical.length).toBe(1);
    expect(similarity("abc", "xyz")).toBeLessThan(40);
  });
});
