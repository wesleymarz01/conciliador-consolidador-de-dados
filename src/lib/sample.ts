import type { Sheet } from "./files";
import type { Row } from "./reconcile";

/** Planilhas fictícias usadas pelo botão "Testar com planilhas de exemplo". */
export function sample(): [Sheet, Sheet] {
  const st = ["Pago", "Pendente", "Pago", "Cancelado"];
  const A: Row[] = [],
    B: Row[] = [];
  for (let i = 1; i <= 60; i++) {
    const id = `PED-${String(1000 + i)}`,
      v = (50 + ((i * 37) % 900)).toFixed(2);
    const s: string = st[i % 4] ?? "Pago";
    if (i <= 54) A.push({ Pedido: id, Cliente: `Cliente ${i}`, Valor: v, Status: s });
    if (i > 4)
      B.push({
        "Código Pedido": id,
        Valor: i % 7 === 0 ? (Number(v) - 2.5).toFixed(2) : v,
        Status: i % 11 === 0 ? "Pendente" : s,
      });
  }
  return [
    { name: "vendas_sistema.csv", columns: ["Pedido", "Cliente", "Valor", "Status"], rows: A },
    { name: "extrato_cartao.csv", columns: ["Código Pedido", "Valor", "Status"], rows: B },
  ];
}
