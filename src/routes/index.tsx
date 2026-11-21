import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, useRef, useEffect } from "react";
import {
  parseFile,
  exportRows,
  columnsOf,
  ALL_SHEETS,
  type Sheet,
  type ParseOpts,
} from "@/lib/files";
import {
  reconcile,
  suggestPairs,
  type MatchRow,
  type Pair,
  type Result,
  type Row,
} from "@/lib/reconcile";
import { getKey, setKey, suggestMapping, diagnose } from "@/lib/gemini";
import { sample } from "@/lib/sample";
import {
  AlertTriangle,
  ArrowLeftRight,
  CheckCircle2,
  FileSpreadsheet,
  GitCompareArrows,
  Loader2,
  Rows3,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  Wand2,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Conciliador — Cruzamento de Planilhas" },
      {
        name: "description",
        content:
          "Cruze duas planilhas Excel ou CSV por colunas-chave e encontre divergências, direto no navegador.",
      },
      { property: "og:title", content: "Conciliador — Cruzamento de Planilhas" },
      {
        property: "og:description",
        content: "Conciliação de dados entre planilhas, rápida e privada no navegador.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

type Tab =
  | "identical"
  | "divergent"
  | "onlyA"
  | "onlyB"
  | "dupA"
  | "dupB"
  | "emptyA"
  | "emptyB"
  | "both"
  | "full";
type Mode = "inventory" | "audit";
const TABS: { id: Tab; label: string; tone: string }[] = [
  { id: "identical", label: "Idênticos", tone: "text-success border-success" },
  { id: "divergent", label: "Divergências", tone: "text-warning border-warning" },
  { id: "onlyA", label: "Apenas na A", tone: "text-destructive border-destructive" },
  { id: "onlyB", label: "Apenas na B", tone: "text-destructive border-destructive" },
];

function Index() {
  const [A, setA] = useState<Sheet | null>(null);
  const [B, setB] = useState<Sheet | null>(null);
  const [keys, setKeys] = useState<Pair[]>([]);
  const [cmp, setCmp] = useState<Pair[]>([]);
  const [opts, setOpts] = useState({ ignoreCase: true, trim: true, stripDomain: true });
  const [mode, setMode] = useState<Mode>("inventory");
  const [nameA, setNameA] = useState("Homologação");
  const [nameB, setNameB] = useState("TSM");
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  // Campos e modo usados no último cruzamento: a exibição segue o resultado, não a tela atual.
  const [ranWith, setRanWith] = useState<{ cmp: Pair[]; fuzzy: boolean; sig: string } | null>(null);
  const [tab, setTab] = useState<Tab>("divergent");
  const [q, setQ] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [aiBusy, setAiBusy] = useState<"" | "map" | "diag">("");
  const [aiErr, setAiErr] = useState("");
  const [diag, setDiag] = useState("");
  const [fuzzy, setFuzzy] = useState(false);
  const [minSim, setMinSim] = useState(75);
  useEffect(() => setHasKey(!!getKey()), []);
  const inv = mode === "inventory";
  const tabs: { id: Tab; label: string; tone: string }[] = inv
    ? [
        { id: "both", label: `Presentes em ambas`, tone: "text-success border-success" },
        { id: "onlyB", label: `Só em ${nameB || "B"}`, tone: "text-warning border-warning" },
        {
          id: "onlyA",
          label: `Só em ${nameA || "A"}`,
          tone: "text-destructive border-destructive",
        },
        {
          id: "full",
          label: `Visão completa (${nameA || "A"} + status)`,
          tone: "text-primary border-primary",
        },
      ]
    : [...TABS];
  // Abas de linhas fora do cruzamento (C2): só aparecem quando há ocorrências.
  const la = inv ? nameA || "A" : "A",
    lb = inv ? nameB || "B" : "B";
  if (result)
    for (const [id, label] of [
      ["dupA", `Duplicadas em ${la}`],
      ["dupB", `Duplicadas em ${lb}`],
      ["emptyA", `Sem chave em ${la}`],
      ["emptyB", `Sem chave em ${lb}`],
    ] as const)
      if (result[id].length) tabs.push({ id, label, tone: "text-warning border-warning" });
  const outside = result
    ? result.dupA.length + result.dupB.length + result.emptyA.length + result.emptyB.length
    : 0;
  const count = (t: Tab) =>
    !result
      ? 0
      : t === "both"
        ? result.identical.length + result.divergent.length
        : t === "full"
          ? result.totalA
          : result[t].length;

  const aiMap = async () => {
    if (!A || !B) return;
    if (!hasKey) return setShowKey(true);
    setAiBusy("map");
    setAiErr("");
    try {
      const r = await suggestMapping(A.columns, B.columns, A.rows.slice(0, 2), B.rows.slice(0, 2));
      if (r.keys.length) setKeys(r.keys);
      setCmp(r.compare);
    } catch (e) {
      setAiErr((e as Error).message);
    } finally {
      setAiBusy("");
    }
  };

  const aiDiag = async () => {
    if (!result) return;
    if (!hasKey) return setShowKey(true);
    setAiBusy("diag");
    setAiErr("");
    setDiag("");
    try {
      const samples = result.divergent.slice(0, 40).map((m) => ({
        chave: m.key,
        diffs: Object.fromEntries(
          m.diffs.map((d) => {
            const c = ranWith?.cmp.find((p) => p.a === d);
            return [d, { A: m.a[d], B: c ? m.b[c.b] : "" }];
          }),
        ),
      }));
      setDiag(
        await diagnose(
          {
            totalA: result.totalA,
            totalB: result.totalB,
            identicos: result.identical.length,
            divergentes: result.divergent.length,
            apenasA: result.onlyA.length,
            apenasB: result.onlyB.length,
          },
          samples,
        ),
      );
    } catch (e) {
      setAiErr((e as Error).message);
    } finally {
      setAiBusy("");
    }
  };

  const onLoad = (side: "a" | "b", s: Sheet, f: File | null) => {
    const nA = side === "a" ? s : A,
      nB = side === "b" ? s : B;
    if (side === "a") {
      setA(s);
      setFileA(f);
    } else {
      setB(s);
      setFileB(f);
    }
    setResult(null);
    if (nA && nB) {
      const sug = suggestPairs(nA.columns, nB.columns);
      setKeys(sug[0] ? [sug[0]] : [{ a: nA.columns[0] ?? "", b: nB.columns[0] ?? "" }]);
      setCmp(sug.slice(1));
    }
  };

  // Configuração efetiva do cruzamento. A assinatura compara a atual com a do último
  // cruzamento para avisar quando o resultado exibido ficou desatualizado.
  const runCmp = inv ? [] : cmp;
  const runOpts = {
    ...opts,
    stripDomain: inv && opts.stripDomain,
    fuzzy: fuzzy ? minSim : undefined,
  };
  const cfgSig = JSON.stringify({ keys, cmp: runCmp, opts: runOpts });
  const stale = !!result && !!ranWith && ranWith.sig !== cfgSig;

  const run = () => {
    if (!A || !B || !keys.length) return;
    const r = reconcile(A.rows, B.rows, keys, runCmp, runOpts);
    setRanWith({ cmp: runCmp, fuzzy, sig: cfgSig });
    setResult(r);
    setDiag("");
    setTab(inv ? "both" : r.divergent.length ? "divergent" : "identical");
  };
  const switchMode = (m: Mode) => {
    setMode(m);
    setResult(null);
  };

  const swap = () => {
    if (!A && !B) return;
    setA(B);
    setB(A);
    setFileA(fileB);
    setFileB(fileA);
    setNameA(nameB);
    setNameB(nameA);
    setKeys(keys.map((p) => ({ a: p.b, b: p.a })));
    setCmp(cmp.map((p) => ({ a: p.b, b: p.a })));
    setResult(null);
  };

  const rows = useMemo<Record<string, string>[]>(() => {
    if (!result) return [];
    const fuzzy = ranWith?.fuzzy ?? false,
      cmp = ranWith?.cmp ?? [];
    let list: Record<string, string>[];
    const la = nameA || "A",
      lb = nameB || "B";
    const merged = (m: MatchRow) => {
      const o: Record<string, string> = { "Match Status": "Encontrado", Chave: m.key };
      if (fuzzy) o["Semelhança (%)"] = m.score === undefined ? "100" : String(m.score);
      for (const [c, v] of Object.entries(m.a)) o[`${c} (${la})`] = v ?? "";
      for (const [c, v] of Object.entries(m.b)) o[`${c} (${lb})`] = v ?? "";
      return o;
    };
    if (
      tab === "onlyA" ||
      tab === "onlyB" ||
      tab === "dupA" ||
      tab === "dupB" ||
      tab === "emptyA" ||
      tab === "emptyB"
    )
      list = result[tab];
    else if (tab === "both") list = [...result.identical, ...result.divergent].map(merged);
    else if (tab === "full") {
      const found = new Map([...result.identical, ...result.divergent].map((m) => [m.a, m]));
      const dup = new Set(result.dupA),
        empty = new Set(result.emptyA);
      list = A
        ? A.rows.map((r) => {
            const m = found.get(r);
            if (m) return merged(m);
            const status = dup.has(r)
              ? "Chave duplicada"
              : empty.has(r)
                ? "Sem chave"
                : "Não Encontrado";
            const o: Record<string, string> = { "Match Status": status, Chave: "" };
            if (fuzzy) o["Semelhança (%)"] = "";
            for (const [c, v] of Object.entries(r)) o[`${c} (${la})`] = v ?? "";
            return o;
          })
        : [];
    } else
      list = result[tab].map((m) => {
        const o: Record<string, string> = { Chave: m.key };
        for (const c of cmp) {
          o[`${c.a} (A)`] = m.a[c.a] ?? "";
          o[`${c.b} (B)`] = m.b[c.b] ?? "";
        }
        if (tab === "divergent") o["Campos divergentes"] = m.diffs.join(", ");
        return o;
      });
    if (!q) return list;
    const s = q.toLowerCase();
    return list.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(s)));
  }, [result, ranWith, tab, q, nameA, nameB, A]);

  const matched = result ? result.identical.length + result.divergent.length : 0;
  const pct =
    result && result.totalA
      ? (result.identical.length / Math.max(result.totalA, result.totalB)) * 100
      : 0;
  // Cobertura sobre as chaves únicas de A (sem duplicadas nem linhas sem chave).
  const uniqueA = result ? result.totalA - result.dupA.length - result.emptyA.length : 0;
  const coverage = uniqueA ? (matched / uniqueA) * 100 : 0;

  return (
    <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-10">
      <header className="mb-8">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="rounded-xl bg-gradient-brand p-2 text-primary-foreground shadow-glow">
              <GitCompareArrows className="h-5 w-5" />
            </span>
            <span className="font-semibold tracking-tight">Conciliador</span>
          </div>
          <button
            onClick={() => setShowKey(true)}
            className="flex items-center gap-2 rounded-full border border-border bg-secondary/70 px-3 py-1.5 text-xs backdrop-blur transition hover:border-primary"
          >
            <span
              className={`h-2 w-2 rounded-full ${hasKey ? "animate-pulse bg-success shadow-[0_0_8px_var(--success)]" : "bg-muted-foreground"}`}
            />
            {hasKey ? "Gemini conectado" : "Conectar Gemini"}
          </button>
        </div>
        <div className="mt-10 text-center sm:mt-14">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 font-mono text-[11px] uppercase tracking-[0.18em] text-primary">
            <ShieldCheck className="h-3.5 w-3.5" />
            100% no navegador
          </span>
          <h1 className="mx-auto mt-4 max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">
            Cruze planilhas e encontre <span className="text-gradient-brand">cada divergência</span>
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
            Envie duas planilhas, escolha as colunas-chave e veja o que bate, o que diverge e o que
            falta. A IA só recebe nomes de colunas e pequenas amostras quando você pedir.
          </p>
        </div>
        {aiErr && (
          <p className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {aiErr}
          </p>
        )}
      </header>
      {showKey && (
        <KeyModal
          onClose={(k) => {
            if (k !== undefined) {
              setKey(k);
              setHasKey(!!k);
              setAiErr("");
            }
            setShowKey(false);
          }}
        />
      )}

      <div className="mx-auto mb-5 flex w-full max-w-xl rounded-xl border border-border bg-secondary/50 p-1 text-sm">
        {(
          [
            ["inventory", "Encontrar em ambas (inventário)"],
            ["audit", "Auditar divergências"],
          ] as const
        ).map(([m, l]) => (
          <button
            key={m}
            onClick={() => switchMode(m)}
            className={`flex-1 rounded-lg px-3 py-2 font-medium transition ${mode === m ? "bg-gradient-brand text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <section className="relative grid gap-4 md:grid-cols-2">
        <Drop
          label={inv ? `Planilha A · ${nameA || "A"}` : "Planilha A"}
          sub={inv ? "Lista a auditar" : "Base"}
          sheet={A}
          file={fileA}
          onLoad={(s, f) => onLoad("a", s, f)}
        />
        <Drop
          label={inv ? `Planilha B · ${nameB || "B"}` : "Planilha B"}
          sub={inv ? "Base de referência" : "Conferência"}
          sheet={B}
          file={fileB}
          onLoad={(s, f) => onLoad("b", s, f)}
        />
        <button
          onClick={swap}
          title="Trocar Planilha A ↔ B"
          aria-label="Trocar Planilha A e B"
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-background p-2 text-primary transition hover:border-primary hover:shadow-glow md:block"
        >
          <ArrowLeftRight className="h-4 w-4" />
        </button>
      </section>
      {!A && !B && (
        <button
          onClick={() => {
            const [a, b] = sample();
            setA(a);
            setB(b);
            setFileA(null);
            setFileB(null);
            setResult(null);
            setNameA("Sistema");
            setNameB("Extrato");
            setKeys([{ a: "Pedido", b: "Código Pedido" }]);
            setCmp([
              { a: "Valor", b: "Valor" },
              { a: "Status", b: "Status" },
            ]);
          }}
          className="mx-auto mt-4 flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <Wand2 className="h-4 w-4" /> Testar com planilhas de exemplo
        </button>
      )}

      {A && B && (
        <section className="glass mt-6 rounded-2xl p-5">
          {inv && (
            <div className="mb-5 grid gap-3 border-b border-border pb-5 sm:grid-cols-2">
              <label className="text-sm text-muted-foreground">
                Nome da Planilha A
                <input
                  value={nameA}
                  onChange={(e) => setNameA(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                />
              </label>
              <label className="text-sm text-muted-foreground">
                Nome da Planilha B
                <input
                  value={nameB}
                  onChange={(e) => setNameB(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-foreground"
                />
              </label>
            </div>
          )}
          <div className="grid gap-6 lg:grid-cols-2">
            <PairEditor
              title="Chave de cruzamento"
              hint={
                inv
                  ? "Coluna que identifica a mesma máquina nas duas (ex: hostname)"
                  : "Colunas que identificam o mesmo registro (ex: CPF, ID)"
              }
              pairs={keys}
              setPairs={setKeys}
              A={A}
              B={B}
              min={1}
            />
            {!inv && (
              <PairEditor
                title="Campos a comparar"
                hint="Valores que devem ser iguais (ex: Valor, Status)"
                pairs={cmp}
                setPairs={setCmp}
                A={A}
                B={B}
                min={0}
              />
            )}
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4">
            <div className="flex w-full flex-wrap items-center gap-3">
              <span className="text-sm font-medium">Estratégia:</span>
              <div className="flex rounded-lg border border-border bg-secondary/50 p-0.5 text-sm">
                {(
                  [
                    [false, "Exato (hostnames e IDs)"],
                    [true, "Aproximado (textos parecidos)"],
                  ] as const
                ).map(([f, l]) => (
                  <button
                    key={l}
                    onClick={() => setFuzzy(f)}
                    className={`rounded-md px-3 py-1.5 transition ${fuzzy === f ? "bg-gradient-brand text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {fuzzy && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  Semelhança mínima
                  <input
                    type="range"
                    min={40}
                    max={100}
                    value={minSim}
                    onChange={(e) => setMinSim(Number(e.target.value))}
                    className="accent-primary"
                  />
                  <span className="w-10 font-mono text-primary">{minSim}%</span>
                </label>
              )}
            </div>
            {(
              [
                ["ignoreCase", "Ignorar maiúsculas/minúsculas"],
                ["trim", "Ignorar espaços extras"],
                ...(inv ? [["stripDomain", "Ignorar domínio (srv01.empresa.local = srv01)"]] : []),
              ] as [keyof typeof opts, string][]
            ).map(([k, l]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={opts[k]}
                  onChange={(e) => setOpts({ ...opts, [k]: e.target.checked })}
                />
                {l}
              </label>
            ))}
            <div className="flex w-full gap-2 sm:ml-auto sm:w-auto">
              <button
                onClick={aiMap}
                disabled={!!aiBusy}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-primary/50 px-4 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/10 disabled:opacity-50"
              >
                {aiBusy === "map" ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {aiBusy === "map" ? "Analisando…" : "Sugerir com IA"}
              </button>
              <button
                onClick={run}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-brand px-5 py-2.5 font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
              >
                <GitCompareArrows className="h-4 w-4" />
                Cruzar dados
              </button>
            </div>
          </div>
        </section>
      )}

      {result && (
        <>
          {stale && (
            <div
              role="status"
              className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-warning/50 bg-warning/10 px-4 py-3 text-sm"
            >
              <span>
                A configuração mudou depois do último cruzamento. O resultado abaixo ainda
                corresponde à configuração anterior.
              </span>
              <button
                onClick={run}
                className="rounded-lg border border-warning/60 px-3 py-1.5 font-medium transition hover:bg-warning/20"
              >
                Cruzar novamente
              </button>
            </div>
          )}
          {inv ? (
            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat
                icon={Rows3}
                label={`Total ${nameA || "A"}`}
                value={result.totalA.toLocaleString("pt-BR")}
              />
              <Stat
                icon={Rows3}
                label={`Total ${nameB || "B"}`}
                value={result.totalB.toLocaleString("pt-BR")}
              />
              <Stat
                icon={CheckCircle2}
                label="Presentes em ambas"
                value={matched.toLocaleString("pt-BR")}
                tone="text-success"
                bar={coverage}
                sub={`${coverage.toFixed(1)}% das chaves únicas de ${nameA || "A"} encontradas em ${nameB || "B"}`}
              />
              <Stat
                icon={AlertTriangle}
                label={`Só em ${nameA || "A"}`}
                value={result.onlyA.length.toLocaleString("pt-BR")}
                tone="text-warning"
                sub={`não aparecem em ${nameB || "B"}`}
              />
            </section>
          ) : (
            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat icon={Rows3} label="Linhas A" value={result.totalA.toLocaleString("pt-BR")} />
              <Stat icon={Rows3} label="Linhas B" value={result.totalB.toLocaleString("pt-BR")} />
              <Stat
                icon={CheckCircle2}
                label="% Conciliação"
                value={`${pct.toFixed(1)}%`}
                tone="text-success"
                bar={pct}
                sub={`${matched.toLocaleString("pt-BR")} chaves em ambas`}
              />
              <Stat
                icon={AlertTriangle}
                label="Divergentes"
                value={result.divergent.length.toLocaleString("pt-BR")}
                tone="text-warning"
                sub={`${(result.onlyA.length + result.onlyB.length).toLocaleString("pt-BR")} sem par`}
              />
            </section>
          )}

          {outside > 0 && (
            <p
              role="status"
              className="mt-4 flex items-start gap-2 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                {outside.toLocaleString("pt-BR")} linha(s) ficaram fora do cruzamento:{" "}
                {[
                  [
                    result.dupA.length + result.dupB.length,
                    "com chave repetida (vale a 1ª ocorrência)",
                  ],
                  [result.emptyA.length + result.emptyB.length, "sem valor na chave"],
                ]
                  .filter(([n]) => n)
                  .map(([n, t]) => `${Number(n).toLocaleString("pt-BR")} ${t}`)
                  .join(" e ")}
                . Veja as abas “Duplicadas” e “Sem chave”.
              </span>
            </p>
          )}

          {!inv && (
            <section className="glass mt-6 rounded-2xl border-primary/30 p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="rounded-xl bg-gradient-brand p-2.5 text-primary-foreground">
                    <Sparkles className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">Diagnóstico com IA</h3>
                    <p className="text-xs text-muted-foreground">
                      O Gemini analisa uma amostra das divergências e aponta padrões e causas.
                    </p>
                  </div>
                </div>
                <button
                  onClick={aiDiag}
                  disabled={!!aiBusy || !result.divergent.length}
                  className="flex items-center gap-2 rounded-xl bg-gradient-brand px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition hover:brightness-110 disabled:opacity-50"
                >
                  {aiBusy === "diag" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analisando…
                    </>
                  ) : (
                    "Gerar diagnóstico"
                  )}
                </button>
              </div>
              {diag && (
                <div className="mt-4 whitespace-pre-wrap rounded-xl border border-border bg-background/50 p-4 text-sm leading-relaxed">
                  {diag}
                </div>
              )}
            </section>
          )}

          <section className="glass mt-6 overflow-hidden rounded-2xl">
            <div className="flex gap-1 overflow-x-auto border-b border-border px-2">
              {tabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm font-medium transition ${tab === t.id ? t.tone : "border-transparent text-muted-foreground hover:text-foreground"}`}
                >
                  {t.label} <span className="ml-1 font-mono text-xs opacity-70">{count(t.id)}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 p-3">
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Filtrar resultados…"
                className="min-w-0 flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:border-ring"
              />
              <button
                onClick={() => exportRows(rows, `conciliacao-${tab}`, "xlsx")}
                className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm hover:bg-accent"
              >
                Exportar .xlsx
              </button>
              <button
                onClick={() => exportRows(rows, `conciliacao-${tab}`, "csv")}
                className="rounded-lg border border-border bg-secondary px-3 py-2 text-sm hover:bg-accent"
              >
                Exportar .csv
              </button>
            </div>
            <DataTable rows={rows} tab={tab === "both" ? "identical" : tab} />
          </section>
        </>
      )}
    </main>
  );
}

function Drop({
  label,
  sub,
  sheet,
  file,
  onLoad,
}: {
  label: string;
  sub: string;
  sheet: Sheet | null;
  file: File | null;
  onLoad: (s: Sheet, f: File | null) => void;
}) {
  const [over, setOver] = useState(false);
  const [err, setErr] = useState("");
  const ref = useRef<HTMLInputElement>(null);
  const handle = async (f?: File | null, o?: ParseOpts) => {
    if (!f) return;
    setErr("");
    try {
      const s = await parseFile(f, o);
      if (!s.columns.length) throw new Error();
      onLoad(s, f);
    } catch {
      setErr(
        "Não foi possível ler o arquivo. Use .xlsx ou .csv com cabeçalho (ajuste 'Pular linhas' se houver título no topo).",
      );
    }
  };
  const ctl =
    "mt-1 w-full rounded-lg border border-input bg-background px-2 py-1.5 text-sm text-foreground";
  const opts = sheet && file && (
    <div className="mt-4 grid grid-cols-2 gap-2" onClick={(e) => e.stopPropagation()}>
      {sheet.sheetNames && (
        <label className="text-xs text-muted-foreground">
          Aba
          <select
            className={ctl}
            value={sheet.sheet}
            onChange={(e) => handle(file, { sheet: e.target.value, skip: sheet.skip })}
          >
            <option value={ALL_SHEETS}>Todas as abas (consolidar)</option>
            {sheet.sheetNames.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="text-xs text-muted-foreground">
        Pular linhas iniciais
        <input
          type="number"
          min={0}
          max={50}
          className={ctl}
          value={sheet.skip ?? 0}
          onChange={(e) =>
            handle(file, { sheet: sheet.sheet, skip: Math.max(0, Number(e.target.value) || 0) })
          }
        />
      </label>
    </div>
  );
  return (
    <div
      onClick={() => ref.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        handle(e.dataTransfer.files[0]);
      }}
      className={`glass group cursor-pointer rounded-2xl border-2 border-dashed p-5 transition-all duration-300 sm:p-6 ${over ? "scale-[1.01] border-primary shadow-glow" : sheet ? "border-success/40" : "border-border hover:border-primary/60 hover:shadow-glow"}`}
    >
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xls,.csv"
        hidden
        onChange={(e) => handle(e.target.files?.[0])}
      />
      <div className="flex items-center gap-3">
        <span
          className={`rounded-xl p-2.5 ${sheet ? "bg-success/15 text-success" : "bg-primary/15 text-primary"}`}
        >
          {sheet ? <CheckCircle2 className="h-5 w-5" /> : <FileSpreadsheet className="h-5 w-5" />}
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold leading-tight">{label}</h2>
          <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            {sub}
          </span>
        </div>
      </div>
      {sheet ? (
        <div className="mt-4">
          <p className="truncate font-mono text-sm text-success">{sheet.name}</p>
          <p className="text-sm text-muted-foreground">
            {sheet.rows.length.toLocaleString("pt-BR")} linhas · {sheet.columns.length} colunas
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {sheet.columns.slice(0, 12).map((c) => (
              <span
                key={c}
                className="rounded-md border border-border bg-muted/60 px-2 py-0.5 font-mono text-xs text-muted-foreground"
              >
                {c}
              </span>
            ))}
            {sheet.columns.length > 12 && (
              <span className="px-1 text-xs text-muted-foreground">
                +{sheet.columns.length - 12}
              </span>
            )}
          </div>
          {opts}
        </div>
      ) : (
        <div className="mt-5 flex flex-col items-center gap-2 py-4 text-center text-sm text-muted-foreground">
          <UploadCloud className="h-8 w-8 text-primary/70 transition group-hover:-translate-y-1" />
          <p>
            Arraste o arquivo aqui ou{" "}
            <span className="font-medium text-primary">clique para selecionar</span>
          </p>
          <span className="rounded-full border border-border px-2 py-0.5 font-mono text-[11px]">
            .xlsx · .csv
          </span>
        </div>
      )}
      {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
    </div>
  );
}

function PairEditor({
  title,
  hint,
  pairs,
  setPairs,
  A,
  B,
  min,
}: {
  title: string;
  hint: string;
  pairs: Pair[];
  setPairs: (p: Pair[]) => void;
  A: Sheet;
  B: Sheet;
  min: number;
}) {
  const sel = "min-w-0 flex-1 rounded-lg border border-input bg-background px-2 py-2 text-sm";
  const upd = (i: number, k: "a" | "b", v: string) =>
    setPairs(pairs.map((p, j) => (j === i ? { ...p, [k]: v } : p)));
  return (
    <div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mb-3 text-xs text-muted-foreground">{hint}</p>
      <div className="space-y-2">
        {pairs.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <select className={sel} value={p.a} onChange={(e) => upd(i, "a", e.target.value)}>
              {A.columns.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <span className="font-mono text-xs text-muted-foreground">↔</span>
            <select className={sel} value={p.b} onChange={(e) => upd(i, "b", e.target.value)}>
              {B.columns.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <button
              disabled={pairs.length <= min}
              onClick={() => setPairs(pairs.filter((_, j) => j !== i))}
              className="px-2 text-muted-foreground hover:text-destructive disabled:opacity-30"
              aria-label="Remover"
            >
              ✕
            </button>
          </div>
        ))}
        <button
          onClick={() => setPairs([...pairs, { a: A.columns[0] ?? "", b: B.columns[0] ?? "" }])}
          className="text-sm text-primary hover:underline"
        >
          + Adicionar coluna
        </button>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "text-foreground",
  sub,
  icon: Icon,
  bar,
}: {
  label: string;
  value: string;
  tone?: string;
  sub?: string;
  icon: typeof Rows3;
  bar?: number;
}) {
  return (
    <div className="glass group relative overflow-hidden rounded-2xl p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <span className={`rounded-lg bg-muted p-1.5 ${tone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className={`mt-2 text-2xl font-bold tabular-nums sm:text-3xl ${tone}`}>{value}</p>
      {bar !== undefined && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-success transition-all duration-700"
            style={{ width: `${Math.min(bar, 100)}%` }}
          />
        </div>
      )}
      {sub && <p className="mt-1 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const LIMIT = 300;
function DataTable({ rows, tab }: { rows: Row[]; tab: Tab }) {
  // União das colunas de todas as linhas: linhas "Não Encontrado" ou de abas diferentes
  // podem não ter todas as colunas da primeira linha.
  const cols = useMemo(() => columnsOf(rows), [rows]);
  if (!rows.length)
    return (
      <p className="p-8 text-center text-sm text-muted-foreground">
        Nenhum registro nesta categoria.
      </p>
    );
  const diffCols = (r: Row) => new Set((r["Campos divergentes"] ?? "").split(", ").filter(Boolean));
  const rowTone =
    tab === "identical"
      ? "border-l-success"
      : tab === "divergent"
        ? "border-l-warning"
        : "border-l-destructive";
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-muted/50 text-left">
          <tr>
            {cols.map((c) => (
              <th
                key={c}
                className="whitespace-nowrap px-3 py-2 font-mono text-xs font-medium text-muted-foreground"
              >
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, LIMIT).map((r, i) => {
            const d = diffCols(r);
            return (
              <tr
                key={i}
                className={`border-l-2 border-t border-border ${r["Match Status"] ? (r["Match Status"] === "Encontrado" ? "border-l-success" : "border-l-destructive") : rowTone} hover:bg-muted/30`}
              >
                {cols.map((c) => {
                  const base = c.replace(/ \((A|B)\)$/, "");
                  const bad = tab === "divergent" && d.has(base) && c !== "Chave";
                  return (
                    <td
                      key={c}
                      className={`whitespace-nowrap px-3 py-2 ${bad ? "bg-destructive/15 text-destructive" : ""} ${c === "Campos divergentes" ? "text-warning" : ""}`}
                    >
                      {r[c]}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      {rows.length > LIMIT && (
        <p className="p-3 text-center text-xs text-muted-foreground">
          Mostrando {LIMIT} de {rows.length.toLocaleString("pt-BR")} — exporte para ver todos.
        </p>
      )}
    </div>
  );
}

function KeyModal({ onClose }: { onClose: (key?: string) => void }) {
  const [v, setV] = useState(() => getKey());
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
      onClick={() => onClose()}
    >
      <div
        className="w-full max-w-md rounded-xl border border-border bg-card p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold">Conectar Google Gemini 4 Argon</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Cole sua chave do Google AI Studio. Ela fica salva apenas neste navegador.{" "}
          <a
            href="https://aistudio.google.com/apikey"
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            Obter chave
          </a>
        </p>
        <input
          type="password"
          value={v}
          onChange={(e) => setV(e.target.value.trim())}
          placeholder="AIza…"
          className="mt-4 w-full rounded-lg border border-input bg-background px-3 py-2 font-mono text-sm outline-none focus:border-ring"
        />
        <div className="mt-5 flex justify-between gap-2">
          <button
            onClick={() => onClose("")}
            className="text-sm text-muted-foreground hover:text-destructive"
          >
            Remover chave
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => onClose()}
              className="rounded-lg border border-border px-3 py-2 text-sm hover:bg-accent"
            >
              Cancelar
            </button>
            <button
              onClick={() => onClose(v)}
              disabled={!v}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            >
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
