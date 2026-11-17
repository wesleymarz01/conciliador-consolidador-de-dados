# Diário de Desenvolvimento

Histórico das etapas do projeto. **Registre apenas o que pode ser comprovado** (commits, testes, resultados de execução). Formato de cada entrada: data, objetivo, alterações, testes e resultados.

---

## 2026-10-16 a 2026-11-11: protótipo no Lovable

**Fonte:** histórico Git do repositório original do protótipo (37 commits, quase todos gerados pelo Lovable).

- **2026-10-16:** projeto criado a partir do modelo `tanstack_start_ts` do Lovable.
- **2026-10-21:** 34 commits no mesmo dia. Entre as mensagens que descrevem o trabalho: "Criou sistema de conciliação", "Wireou modal Gemini", "Testou fluxo completo", "Ativou modos cruzamento", "Adicionou 4 melhorias ao app" e "Implementou troca de ambientes". Os demais commits têm a mensagem genérica "Changes".
- **2026-11-11:** "Atualiza README profissional e reforça .gitignore para arquivos .env" e "Add project north star".

**Resultado:** aplicação funcional com cruzamento exato e aproximado, modos Inventário e Auditoria, exportação, integração opcional com Gemini e 8 testes automatizados.

---

## 2026-11-17: auditoria técnica

**Objetivo:** entender o projeto antes de qualquer mudança.

**O que foi feito:** leitura integral do código próprio, execução de testes, typecheck, lint, build, `npm audit` e testes práticos do motor com casos-limite e medição de desempenho.

**Resultados:**

- 8/8 testes passando, typecheck sem erros, build OK.
- O lint falhava por formatação (182 erros do Prettier).
- Problemas confirmados por execução:
  - "Ignorar domínio" truncava CPF, CNPJ e e-mail (falsos positivos);
  - duplicatas e chaves vazias eram tratadas em silêncio;
  - `R$` não era reconhecido com "Ignorar maiúsculas";
  - o CSV exportado perdia colunas;
  - a estratégia Aproximada não tinha exclusividade e era lenta;
  - a dependência `xlsx` é vulnerável.
- Desempenho medido: modo exato com 200 mil × 200 mil linhas em ~0,35 s; modo aproximado com 1.000 × 2.000 linhas em ~6,4 s.

---

## 2026-11-17: Fase 0, correções de confiabilidade

**Objetivo:** corrigir os problemas que geravam números errados sem aviso.

**O que foi feito** (num repositório privado de desenvolvimento, em commits separados):

- Formatação Prettier (lint passou de 182 erros para 0), CI e testes de caracterização.
- **C1:** "Ignorar domínio" passou a valer só para valores com formato de hostname.
- **A1:** `R$` reconhecido também com "Ignorar maiúsculas".
- **A2:** exportação e tabela com todas as colunas.
- **C2:** duplicatas e linhas sem chave separadas em abas próprias, com aviso.

**Testes:** de 8 para 48 testes automatizados, todos passando. O resultado de referência dos dados de exemplo ficou inalterado (40 idênticos, 10 divergentes, 4 só em A, 6 só em B). Verificação manual no navegador com planilhas fictícias. CI verde em todas as branches.

---

## 2026-11-17: criação deste repositório público independente

**Objetivo:** dar ao projeto uma identidade própria, executável localmente e sem dependência operacional do Lovable, com documentação completa.

**O que foi feito:**

- Código copiado do estado final da Fase 0, **sem o histórico Git anterior**.
- Varredura de segredos: nenhuma chave, token, `.env` ou dado real encontrado. Os CPFs e o e-mail presentes nos testes são fictícios.
- **Não copiados:** pasta `.lovable/`, `bun.lock`, `bunfig.toml`, `src/lib/lovable-error-reporting.ts` (telemetria do editor Lovable) e documentos internos da fase anterior.
- `vite.config.ts` reescrito sem `@lovable.dev/vite-tanstack-config`, usando apenas plugins já presentes (Tailwind, tsconfig-paths, TanStack Start, React) e Nitro com preset `node-server`.
- Removidas, em `__root.tsx`, a chamada de telemetria do Lovable e a meta `twitter:site @Lovable`.
- `package.json`: nome do projeto, versão 0.1.0, scripts `start` e `typecheck`, `engines` (Node ≥ 20). Gerenciador passa a ser npm (`package-lock.json`).
- Nenhuma mudança na lógica da aplicação.
- Documentação criada: README, `docs/` (funcional, guia do usuário, arquitetura, limitações, roadmap, anotações, diário), CHANGELOG e AGENTS.

**Testes e resultados** (Node 26.13.1, Windows):

- `npm test`: 48/48 testes passando.
- `npm run typecheck`: sem erros.
- `npm run lint`: 0 erros (6 avisos em componentes de UI herdados).
- `npm run build`: OK, saída em `.output/` (preset `node-server`).
- `npm start`: a página carregou no navegador. Fluxo com os dados de exemplo no modo Auditoria: 40 / 10 / 4 / 6, igual à referência. Visual conferido por captura de tela.
- `npm run dev`: servidor respondeu HTTP 200 em `http://localhost:8080`.
- CI no GitHub Actions (Node 22, `npm ci`): typecheck, lint, testes e build com sucesso no primeiro push.

**Organização no GitHub:**

- Labels criadas: `documentação`, `melhoria`, `nova funcionalidade`, `segurança` e `desempenho` (a label `bug` já existia).
- Issues #1 a #17 abertas a partir das limitações documentadas em `docs/LIMITACOES.md`, todas conferidas no código. Nenhuma marcada como concluída.
- **GitHub Projects não criado:** a credencial disponível não tem o escopo `project` (erro `INSUFFICIENT_SCOPES` da API). Fica pendente.
