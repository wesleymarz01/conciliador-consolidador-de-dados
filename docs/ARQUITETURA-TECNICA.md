# Arquitetura Técnica

## 1. Visão geral

Aplicação **React de página única** construída com **TanStack Start** (SSR leve) e **Vite**. Toda a lógica de leitura, cruzamento e exportação roda **no navegador**. O servidor só entrega a página: não há API, banco de dados nem armazenamento de arquivos.

```
Navegador
 ├─ Leitura de arquivos  (src/lib/files.ts → SheetJS / PapaParse)
 ├─ Motor de conciliação (src/lib/reconcile.ts)  ← funções puras, testadas
 ├─ Interface            (src/routes/index.tsx)
 ├─ Exportação           (src/lib/files.ts → .xlsx / .csv)
 └─ IA opcional          (src/lib/gemini.ts → API do Google, com a chave do usuário)
Servidor Node local (npm start) ou Vite (npm run dev)
 └─ Renderiza e entrega a página (src/server.ts, src/start.ts)
```

## 2. Estrutura de pastas

```
.
├─ .github/workflows/ci.yml   CI: typecheck, lint, testes e build
├─ docs/                      documentação do projeto
├─ public/                    favicon e robots.txt
├─ src/
│  ├─ routes/
│  │  ├─ __root.tsx           layout HTML, fontes, páginas 404 e de erro
│  │  └─ index.tsx            tela da aplicação (estado, componentes, tabela)
│  ├─ lib/
│  │  ├─ reconcile.ts         motor: normalização, hostname, números, similaridade, cruzamento
│  │  ├─ files.ts             leitura CSV/XLSX, consolidação de abas, exportação, união de colunas
│  │  ├─ gemini.ts            cliente do Google Gemini (navegador)
│  │  ├─ sample.ts            dados de exemplo fictícios
│  │  ├─ error-capture.ts     captura de erros do SSR para log
│  │  ├─ error-page.ts        página de erro do servidor
│  │  ├─ utils.ts             utilitário de classes CSS
│  │  └─ *.test.ts            testes unitários (ao lado do código testado)
│  ├─ components/ui/          componentes de interface (shadcn/Radix), hoje não usados pela tela
│  ├─ hooks/                  hook de detecção de tela pequena (hoje não usado)
│  ├─ test/                   configuração do Vitest e teste de rotas
│  ├─ router.tsx, start.ts, server.ts, routeTree.gen.ts   infraestrutura do TanStack Start
│  └─ styles.css              tema e estilos (Tailwind 4)
├─ vite.config.ts             configuração de build e desenvolvimento
├─ vitest.config.ts           configuração de testes
└─ package.json / package-lock.json
```

## 3. Tecnologias e dependências

| Área      | Tecnologia                             | Uso                                           |
| --------- | -------------------------------------- | --------------------------------------------- |
| Interface | React 19, Tailwind CSS 4, Lucide       | Tela e ícones                                 |
| Framework | TanStack Start 1.168 / Router 1.170    | Rotas, SSR e entrada de servidor              |
| Build     | Vite 8, Nitro 3 (preset `node-server`) | Desenvolvimento e build local em `.output/`   |
| Planilhas | SheetJS `xlsx` 0.18.5, PapaParse 5.7   | Leitura de XLSX/XLS/CSV e geração de XLSX/CSV |
| Linguagem | TypeScript 5.8 (modo estrito)          | —                                             |
| Testes    | Vitest 4, Testing Library, jsdom       | Testes unitários e de rota                    |
| Qualidade | ESLint 9, Prettier 3                   | Lint e formatação                             |

O `package.json` também declara dependências herdadas do modelo inicial (Radix UI, recharts, zod, react-hook-form, date-fns, entre outras) que **não são usadas pela tela atual**. Elas foram mantidas nesta etapa para não alterar o projeto; a remoção está registrada no roadmap.

### Diferenças em relação ao protótipo do Lovable

- O wrapper `@lovable.dev/vite-tanstack-config` foi substituído por uma configuração explícita do Vite com os mesmos plugins essenciais (Tailwind, caminhos do tsconfig, TanStack Start, React) e sem os plugins exclusivos do ambiente Lovable.
- O build usa o preset **`node-server`** do Nitro (execução local com `npm start`) no lugar do preset de Cloudflare Workers.
- A chamada de telemetria de erros do editor Lovable (`lovable-error-reporting.ts`) e a meta `twitter:site @Lovable` foram removidas. Não há impacto para o usuário.
- O gerenciador de pacotes passou a ser o **npm** (`package-lock.json`).

## 4. Motor de conciliação (`src/lib/reconcile.ts`)

| Função                              | Responsabilidade                                                                                        |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `normalize(v, o)`                   | Aplica _trim_ e redução de espaços e minúsculas, conforme as opções                                     |
| `isHostname(s)` / `stripDomain(s)`  | Detecta hostname com domínio e remove o domínio                                                         |
| `valuesEqual(x, y, o)`              | Igualdade textual normalizada ou numérica (BR/US, `R$`)                                                 |
| `cleanText(v)` / `similarity(x, y)` | Limpeza e semelhança 0–100 no estilo _token set ratio_ (Levenshtein)                                    |
| `reconcile(A, B, keys, compare, o)` | Classifica as linhas em `identical`, `divergent`, `onlyA`, `onlyB`, `dupA`, `dupB`, `emptyA` e `emptyB` |
| `suggestPairs(colsA, colsB)`        | Sugere pares de colunas com o mesmo nome                                                                |

**Algoritmo do cruzamento:**

1. Indexa B num `Map` pela chave normalizada, separando linhas sem chave e duplicadas.
2. Percorre A, separando as linhas sem chave e as duplicadas. Para as demais, busca em B em tempo O(1).
3. No modo aproximado, se não houver correspondência exata, compara a chave com todas as chaves de B.

**Complexidade:** o modo exato é O(|A| + |B|). O modo aproximado é O(|A sem par| × |B| × L²), onde L é o tamanho da chave.

**Desempenho medido:** o motor isolado, em Node e nesta máquina de desenvolvimento, cruzou 200 mil × 200 mil linhas no modo exato em cerca de 0,35 s. No modo aproximado, 1.000 linhas sem par contra 2.000 levaram cerca de 6,4 s. A leitura de arquivos grandes no navegador não foi medida.

## 5. Interface (`src/routes/index.tsx`)

Arquivo único com o componente `Index` (estado da tela) e os subcomponentes `Drop` (upload), `PairEditor` (pares de colunas), `Stat` (indicadores), `DataTable` (tabela de até 300 linhas) e `KeyModal` (chave do Gemini). As linhas exibidas e exportadas são montadas num `useMemo` a partir do resultado do motor.

## 6. Testes

| Arquivo                                    | Cobre                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `src/lib/reconcile.test.ts`                | Casos básicos do motor (testes originais do protótipo)                                                                    |
| `src/lib/reconcile.caracterizacao.test.ts` | Normalização, moeda, hostname, chaves compostas, duplicadas, sem chave e a regra "cada linha em exatamente uma categoria" |
| `src/lib/files.test.ts`                    | Leitura de CSV (vírgula, ponto e vírgula, acentos, pular linhas) e de XLSX (abas, consolidação, aba inexistente)          |
| `src/lib/export.test.ts`                   | Exportação CSV com BOM e união de colunas                                                                                 |
| `src/lib/sample.test.ts`                   | Resultado de referência dos dados de exemplo (com snapshot)                                                               |
| `src/test/app-routing.test.tsx`            | A rota `/` existe                                                                                                         |

**Convenções:**

- Os testes ficam ao lado do código (`*.test.ts`).
- Arquivos que precisam de APIs do Node usam `// @vitest-environment node`.
- Usar **somente dados fictícios**. Planilhas de teste são geradas em memória dentro dos próprios testes.

**Não coberto por testes automatizados:** a interface (componentes e fluxo completo), a exportação XLSX e a integração com o Gemini.

## 7. Integração contínua

O arquivo `.github/workflows/ci.yml` roda `npm ci`, `typecheck`, `lint`, `test` e `build` a cada _push_ e _pull request_, usando o GitHub Actions, que é gratuito para repositórios públicos. Não há deploy automático.

## 8. Segurança e privacidade

- Não há credenciais no repositório. A chave do Gemini é informada pelo usuário e fica no `localStorage` do navegador.
- Os dados das planilhas não saem do navegador, exceto nas ações de IA iniciadas pelo usuário (ver [DOCUMENTACAO-FUNCIONAL.md](DOCUMENTACAO-FUNCIONAL.md#8-assistência-com-ia-opcional)).
- Riscos conhecidos estão em [LIMITACOES.md](LIMITACOES.md#segurança).
