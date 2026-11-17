export type Row = Record<string, string>;
export interface Pair {
  a: string;
  b: string;
}
export interface Options {
  ignoreCase: boolean;
  trim: boolean;
}
export interface MatchRow {
  key: string;
  a: Row;
  b: Row;
  diffs: string[];
  score?: number | undefined;
}
export interface Result {
  identical: MatchRow[];
  divergent: MatchRow[];
  onlyA: Row[];
  onlyB: Row[];
  /** Linhas de A cuja chave já apareceu antes em A (fora do cruzamento). */
  dupA: Row[];
  /** Linhas de B cuja chave já apareceu antes em B (fora do cruzamento). */
  dupB: Row[];
  /** Linhas de A com todas as colunas-chave vazias (fora do cruzamento). */
  emptyA: Row[];
  /** Linhas de B com todas as colunas-chave vazias (fora do cruzamento). */
  emptyB: Row[];
  totalA: number;
  totalB: number;
}

export function normalize(v: unknown, o: Options): string {
  let s = v == null ? "" : String(v);
  if (o.trim) s = s.trim().replace(/\s+/g, " ");
  if (o.ignoreCase) s = s.toLowerCase();
  return s;
}

function toNumber(s: string): number | null {
  const t = s.trim();
  if (!t) return null;
  // Remove símbolo de moeda ("R$", "r$" após "ignorar maiúsculas", "$") e espaços.
  let n = t.replace(/r?\$/gi, "").replace(/\s/g, "");
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?$/.test(n) || /^-?\d+,\d+$/.test(n))
    n = n.replace(/\./g, "").replace(",", ".");
  else n = n.replace(/,/g, "");
  if (!/^-?\d+(\.\d+)?$/.test(n)) return null;
  return Number(n);
}

export function valuesEqual(x: unknown, y: unknown, o: Options): boolean {
  const a = normalize(x, o),
    b = normalize(y, o);
  if (a === b) return true;
  const na = toNumber(a),
    nb = toNumber(b);
  return na !== null && nb !== null && Math.abs(na - nb) < 1e-9;
}

const HOST_LABEL = /^[a-z0-9_](?:[a-z0-9_-]*[a-z0-9_])?$/i;
const HAS_LETTER = /[a-z]/i;

/**
 * Indica se o valor tem formato de hostname com domínio (ex.: "SRV01.corp.local").
 * Exige ao menos 2 rótulos válidos (letras, dígitos, "-" e "_"), letra no 1º rótulo e
 * letra em algum rótulo de domínio. Assim ficam de fora IPv4, CPF/CNPJ, e-mails,
 * "IP:porta", números decimais e versões ("1.2.3").
 */
export function isHostname(s: string): boolean {
  const labels = (s.endsWith(".") ? s.slice(0, -1) : s).split(".");
  if (labels.length < 2 || !labels.every((l) => HOST_LABEL.test(l))) return false;
  return HAS_LETTER.test(labels[0]!) && labels.slice(1).some((l) => HAS_LETTER.test(l));
}

/** Hostname "SRV01.corp.local" -> "SRV01". Valores que não são hostname ficam intactos. */
export function stripDomain(s: string): string {
  return isHostname(s) ? s.split(".")[0]! : s;
}

/** Limpeza para modo aproximado: sem acentos, só a-z0-9 e espaços. */
export function cleanText(v: unknown): string {
  return String(v ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function ratio(a: string, b: string): number {
  if (!a.length && !b.length) return 100;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(
        prev[j]! + 1,
        cur[j - 1]! + 1,
        prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 2),
      );
    prev = cur;
  }
  return Math.round((1 - prev[b.length]! / (a.length + b.length)) * 100);
}

/** Semelhança 0-100 no estilo token_set_ratio. */
export function similarity(x: string, y: string): number {
  const ta = new Set(x.split(" ").filter(Boolean)),
    tb = new Set(y.split(" ").filter(Boolean));
  const inter = [...ta]
    .filter((t) => tb.has(t))
    .sort()
    .join(" ");
  const da = [...ta]
      .filter((t) => !tb.has(t))
      .sort()
      .join(" "),
    db = [...tb]
      .filter((t) => !ta.has(t))
      .sort()
      .join(" ");
  const s1 = [inter, da].filter(Boolean).join(" "),
    s2 = [inter, db].filter(Boolean).join(" ");
  return Math.max(ratio(s1, s2), inter ? ratio(inter, s1) : 0, inter ? ratio(inter, s2) : 0);
}

export function reconcile(
  A: Row[],
  B: Row[],
  keys: Pair[],
  compare: Pair[],
  o: Options & { stripDomain?: boolean; fuzzy?: number | undefined },
): Result {
  const keyPart = (v: unknown) => {
    const n = normalize(v, o);
    return o.stripDomain ? stripDomain(n) : n;
  };
  const parts = (r: Row, side: "a" | "b") => keys.map((k) => keyPart(r[k[side]]));
  const res: Result = {
    identical: [],
    divergent: [],
    onlyA: [],
    onlyB: [],
    dupA: [],
    dupB: [],
    emptyA: [],
    emptyB: [],
    totalA: A.length,
    totalB: B.length,
  };
  // Política de duplicatas: vale a 1ª ocorrência de cada chave; as seguintes e as linhas
  // sem chave ficam fora do cruzamento, listadas à parte. Assim toda linha de A e de B
  // aparece em exatamente uma categoria do resultado.
  const mapB = new Map<string, Row>();
  for (const r of B) {
    const p = parts(r, "b");
    if (p.every((x) => x === "")) res.emptyB.push(r);
    else if (mapB.has(p.join(" | "))) res.dupB.push(r);
    else mapB.set(p.join(" | "), r);
  }
  const seen = new Set<string>();
  const seenA = new Set<string>();
  const fz = o.fuzzy
    ? [...mapB.keys()].map((k) => ({ k, c: cleanText(k) })).filter((x) => x.c)
    : [];
  for (const r of A) {
    const p = parts(r, "a");
    let k = p.join(" | ");
    if (p.every((x) => x === "")) {
      res.emptyA.push(r);
      continue;
    }
    if (seenA.has(k)) {
      res.dupA.push(r);
      continue;
    }
    seenA.add(k);
    let m = mapB.get(k);
    let score: number | undefined;
    if (!m && o.fuzzy) {
      const c = cleanText(k);
      let best = { k: "", s: -1 };
      if (c)
        for (const x of fz) {
          const s = similarity(c, x.c);
          if (s > best.s) best = { k: x.k, s };
        }
      if (best.s >= o.fuzzy) {
        m = mapB.get(best.k);
        k = best.k;
        score = best.s;
      }
    }
    if (!m) {
      res.onlyA.push(r);
      continue;
    }
    seen.add(k);
    const diffs = compare.filter((c) => !valuesEqual(r[c.a], m[c.b], o)).map((c) => c.a);
    (diffs.length ? res.divergent : res.identical).push({ key: k, a: r, b: m, diffs, score });
  }
  for (const [k, r] of mapB) if (!seen.has(k)) res.onlyB.push(r);
  return res;
}

export function suggestPairs(colsA: string[], colsB: string[]): Pair[] {
  const lb = new Map(colsB.map((c) => [c.trim().toLowerCase(), c]));
  return colsA.flatMap((c) => {
    const m = lb.get(c.trim().toLowerCase());
    return m ? [{ a: c, b: m }] : [];
  });
}
