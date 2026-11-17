# Orientações para agentes de desenvolvimento

Este repositório é o **Conciliador & Consolidador de Dados**, um projeto independente. Ele não está ligado ao Lovable nem a outros repositórios: não sincronize, não publique em outros remotos e não altere projetos anteriores a partir daqui.

## Antes de mudar qualquer coisa

1. Leia o `README.md`, `docs/DOCUMENTACAO-FUNCIONAL.md` e `docs/LIMITACOES.md`.
2. Rode `npm install` e confirme a linha de base: `npm run typecheck`, `npm run lint`, `npm test` e `npm run build`.
3. Confirme com o responsável qualquer mudança de comportamento, remoção de funcionalidade ou nova dependência.

## Regras

- **Não implementar funcionalidades nem mudar comportamento sem aprovação.** O roadmap (`docs/ROADMAP.md`) é uma lista de possibilidades, não de tarefas aprovadas.
- **Testes antes e depois:** para corrigir um defeito, primeiro escreva um teste que falhe. Mudanças intencionais em resultados devem atualizar o teste de referência (`src/lib/sample.test.ts`) e ser registradas no CHANGELOG.
- **Somente dados fictícios** em testes, exemplos e documentação. Nunca use dados reais de empresas ou pessoas.
- **Nunca versionar segredos:** chaves de API, tokens, `.env`, planilhas reais.
- **Dependências:** não adicione sem necessidade clara. Use npm e mantenha o `package-lock.json` atualizado.
- **Commits:** pequenos e organizados, no padrão Conventional Commits em português (ex.: `fix(motor): ...`, `docs: ...`). Uma branch e um PR por assunto.
- **Documentação:** atualize `CHANGELOG.md`, `docs/DIARIO-DE-DESENVOLVIMENTO.md` (só fatos comprováveis: data, objetivo, alterações, testes e resultados) e os documentos afetados.
- **Não documentar como existente** o que não está implementado.

## Mapa do código

- Motor de conciliação: `src/lib/reconcile.ts` (funções puras; o melhor lugar para testes).
- Leitura e exportação: `src/lib/files.ts`.
- Interface: `src/routes/index.tsx`.
- IA opcional: `src/lib/gemini.ts`.
- Testes: `*.test.ts` ao lado do código. Use `// @vitest-environment node` quando precisar de APIs do Node (ex.: `File`).
- `src/routeTree.gen.ts` é gerado automaticamente; não edite à mão.

## Comandos

| Comando                       | Uso                                      |
| ----------------------------- | ---------------------------------------- |
| `npm run dev`                 | Desenvolvimento em http://localhost:8080 |
| `npm test`                    | Testes (Vitest)                          |
| `npm run typecheck`           | TypeScript                               |
| `npm run lint`                | ESLint + Prettier                        |
| `npm run build` / `npm start` | Build local e execução com Node          |
