// Browser-side Gemini client. The user's own key stays in localStorage.
export const MODEL = "gemini-4-argon";
const KEY = "gemini_api_key";

export const getKey = () =>
  typeof window === "undefined" ? "" : (localStorage.getItem(KEY) ?? "");
export const setKey = (k: string) =>
  k ? localStorage.setItem(KEY, k) : localStorage.removeItem(KEY);

export async function ask(prompt: string, json = false): Promise<string> {
  const key = getKey();
  if (!key) throw new Error("Configure sua chave do Google AI primeiro.");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: json ? { responseMimeType: "application/json" } : {},
      }),
    },
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 400 || res.status === 403)
      throw new Error("Chave inválida ou sem acesso ao Gemini 4 Argon (requer plano pago).");
    if (res.status === 429)
      throw new Error("Limite de uso atingido. Tente novamente em instantes.");
    throw new Error(data?.error?.message ?? `Erro ${res.status}`);
  }
  return (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text ?? "")
    .join("");
}

export async function suggestMapping(
  colsA: string[],
  colsB: string[],
  sampleA: object[],
  sampleB: object[],
) {
  const txt = await ask(
    `Você mapeia colunas entre duas planilhas para conciliação.
Planilha A colunas: ${JSON.stringify(colsA)}; amostra: ${JSON.stringify(sampleA)}
Planilha B colunas: ${JSON.stringify(colsB)}; amostra: ${JSON.stringify(sampleB)}
Responda JSON: {"keys":[{"a":"colA","b":"colB"}],"compare":[{"a":"colA","b":"colB"}]}
"keys" = colunas identificadoras únicas (CPF, ID, código). "compare" = demais colunas equivalentes. Use somente nomes exatos.`,
    true,
  );
  const r = JSON.parse(txt) as {
    keys?: { a: string; b: string }[];
    compare?: { a: string; b: string }[];
  };
  const ok = (p: { a: string; b: string }) => colsA.includes(p.a) && colsB.includes(p.b);
  return { keys: (r.keys ?? []).filter(ok), compare: (r.compare ?? []).filter(ok) };
}

export function diagnose(summary: object, samples: object[]) {
  return ask(
    `Você é analista de conciliação de dados. Resumo: ${JSON.stringify(summary)}
Amostra de divergências (até 40): ${JSON.stringify(samples)}
Em português, escreva um diagnóstico executivo curto: padrões encontrados, prováveis causas e recomendações. Use tópicos com "- ". Sem markdown de títulos.`,
  );
}
