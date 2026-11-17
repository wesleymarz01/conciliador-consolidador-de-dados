# Diário de Desenvolvimento

Registro cronológico da evolução técnica do projeto, contemplando decisões de desenvolvimento, implementações, correções, testes e resultados obtidos em cada etapa.

Este documento tem como objetivo preservar o histórico do desenvolvimento, facilitar a rastreabilidade das alterações e registrar a evolução do projeto com base nas evidências técnicas disponíveis, incluindo código-fonte, commits, testes e resultados de execução.

---

## 2026-10-16 a 2026-11-11 — Desenvolvimento inicial e disponibilização para testes

### Contexto do projeto

A ideia e o desenvolvimento inicial do projeto antecederam sua utilização na plataforma Lovable. A concepção original envolveu uma etapa de desenvolvimento em Python, seguida pela evolução da aplicação em outro ambiente.

Posteriormente, uma versão do projeto foi disponibilizada na Lovable para testes e utilização por uma pessoa convidada.

A plataforma Lovable participou dessa etapa como ambiente de desenvolvimento e disponibilização de uma versão da aplicação, dentro de uma trajetória de desenvolvimento que já havia sido iniciada anteriormente.

### Histórico técnico registrado

A versão que passou pelo ambiente Lovable possui um histórico Git com 37 commits. Os registros abaixo descrevem as alterações documentadas nesse repositório.

- **2026-10-16:** registro de criação da versão a partir do modelo `tanstack_start_ts`, disponibilizado no ambiente Lovable.
- **2026-10-21:** concentração de 34 commits no mesmo dia. Entre as mensagens registradas estão: "Criou sistema de conciliação", "Wireou modal Gemini", "Testou fluxo completo", "Ativou modos cruzamento", "Adicionou 4 melhorias ao app" e "Implementou troca de ambientes". Os demais commits apresentam a mensagem genérica "Changes".
- **2026-11-11:** registros de atualização do README, reforço do `.gitignore` para arquivos `.env` e inclusão do documento "project north star".

Os metadados de autoria dos commits descrevem os registros técnicos daquele repositório e devem ser interpretados dentro do contexto de utilização da plataforma.

### Resultado da etapa

A versão disponibilizada apresentava:

- Cruzamento exato e aproximado de dados.
- Modos Inventário e Auditoria.
- Exportação de resultados.
- Integração opcional com Gemini.
- 8 testes automatizados.

---

## 2026-11-17 — Auditoria técnica do projeto

### Objetivo

Realizar uma análise técnica abrangente da aplicação antes de iniciar novas alterações, identificando problemas de confiabilidade, desempenho, estrutura e manutenção.

### Atividades realizadas

- Leitura integral do código-fonte próprio.
- Execução da suíte de testes automatizados.
- Verificação de TypeScript (typecheck).
- Análise de lint e formatação.
- Compilação da aplicação (build).
- Verificação de dependências com `npm audit`.
- Testes práticos do motor de conciliação com casos-limite.
- Medições de desempenho com diferentes volumes de dados.

### Resultados identificados

- 8/8 testes automatizados aprovados.
- Typecheck sem erros.
- Build concluído com sucesso.
- Lint apresentou 182 ocorrências relacionadas à formatação pelo Prettier.

### Problemas identificados e reproduzidos

1. A opção "Ignorar domínio" podia truncar CPF, CNPJ e e-mail, provocando falsos positivos.
2. Duplicatas e chaves vazias eram tratadas silenciosamente.
3. O símbolo `R$` não era reconhecido corretamente com a opção "Ignorar maiúsculas".
4. O CSV exportado não preservava todas as colunas.
5. A estratégia Aproximada não garantia exclusividade nos cruzamentos e apresentava desempenho insatisfatório.
6. A dependência `xlsx` apresentava vulnerabilidade identificada na análise de segurança.

### Desempenho medido

- **Modo Exato:** 200 mil × 200 mil linhas processadas em aproximadamente 0,35 segundo.
- **Modo Aproximado:** 1.000 × 2.000 linhas processadas em aproximadamente 6,4 segundos.

Os resultados serviram como referência para definir as prioridades da primeira fase de correções.

---

## 2026-11-17 — Fase 0: correções de confiabilidade

### Objetivo

Corrigir problemas que poderiam comprometer a precisão dos resultados ou ocultar inconsistências durante o processo de conciliação.

### Implementações realizadas

As correções foram desenvolvidas em um repositório privado de desenvolvimento, com commits separados para facilitar o acompanhamento das alterações.

- **Infraestrutura e qualidade:** aplicação da formatação Prettier, configuração de CI e criação de testes de caracterização.
- **C1 — Ignorar domínio:** a funcionalidade passou a ser aplicada somente a valores que apresentam formato de hostname.
- **A1 — Reconhecimento de moeda:** o símbolo `R$` passou a ser reconhecido também com a opção "Ignorar maiúsculas".
- **A2 — Exportação:** correção da exportação e da tabela para preservar todas as colunas.
- **C2 — Integridade dos dados:** duplicatas e linhas sem chave passaram a ser identificadas separadamente, com apresentação em abas próprias e avisos ao usuário.

### Testes e validações

- Evolução de 8 para 48 testes automatizados.
- Todos os 48 testes aprovados.
- Formatação: redução de 182 ocorrências para zero.
- CI executada com sucesso em todas as branches verificadas.

O resultado de referência dos dados de exemplo permaneceu inalterado:

| Resultado | Quantidade |
|---|---:|
| Idênticos | 40 |
| Divergentes | 10 |
| Somente em A | 4 |
| Somente em B | 6 |

Também foi realizada verificação manual no navegador, utilizando planilhas fictícias.

---

## 2026-11-17 — Criação do repositório público independente

### Objetivo

Estabelecer uma estrutura própria para o projeto, permitindo sua execução local, manutenção independente do ambiente Lovable e continuidade do desenvolvimento com documentação técnica organizada.

### Preparação e organização do código

O repositório público foi criado a partir do estado final da Fase 0.

O código-fonte foi transferido sem incorporar o histórico Git anterior, estabelecendo um novo histórico independente para esta etapa de desenvolvimento.

### Segurança e limpeza do projeto

Foi realizada uma varredura de arquivos e informações sensíveis.

- Nenhuma chave, token, arquivo `.env` ou dado real foi encontrado.
- Os CPFs e o endereço de e-mail utilizados nos testes são fictícios.

Não foram incorporados ao novo repositório:

- Pasta `.lovable/`.
- Arquivos `bun.lock` e `bunfig.toml`.
- `src/lib/lovable-error-reporting.ts`, relacionado à telemetria do editor Lovable.
- Documentos internos da etapa anterior.

### Independência de infraestrutura

O arquivo `vite.config.ts` foi reescrito para remover a dependência de `@lovable.dev/vite-tanstack-config`.

A configuração passou a utilizar os plugins já presentes no projeto:

- Tailwind.
- tsconfig-paths.
- TanStack Start.
- React.
- Nitro com preset `node-server`.

Também foram realizadas as seguintes alterações:

- Remoção da chamada de telemetria da Lovable em `__root.tsx`.
- Remoção da meta `twitter:site @Lovable`.
- Atualização do `package.json` com o nome do projeto e versão `0.1.0`.
- Inclusão dos scripts `start` e `typecheck`.
- Definição de `engines` com Node ≥ 20.
- Adoção do npm como gerenciador de pacotes, utilizando `package-lock.json`.

**Importante:** nenhuma alteração foi realizada na lógica funcional da aplicação durante essa etapa de independência.

### Documentação criada

Foi estruturada a documentação do projeto, contemplando:

- README.
- Documentação funcional.
- Guia do usuário.
- Arquitetura.
- Limitações conhecidas.
- Roadmap.
- Anotações técnicas.
- Diário de desenvolvimento.
- CHANGELOG.
- AGENTS.

### Testes e resultados

Ambiente utilizado: Node 26.13.1, Windows.

| Verificação | Resultado |
|---|---|
| `npm test` | 48/48 testes aprovados |
| `npm run typecheck` | Sem erros |
| `npm run lint` | 0 erros e 6 avisos em componentes de UI herdados |
| `npm run build` | Concluído com sucesso |
| `npm start` | Aplicação carregada no navegador |
| `npm run dev` | Servidor respondeu HTTP 200 |

A compilação gerou a saída em `.output/`, utilizando o preset `node-server`.

### Validação funcional

Foi executado um teste com os dados de exemplo no modo Auditoria.

Os resultados permaneceram consistentes com a referência:

- 40 registros idênticos.
- 10 registros divergentes.
- 4 registros somente em A.
- 6 registros somente em B.

A interface também foi conferida visualmente por meio de captura de tela.

### Integração contínua

A pipeline do GitHub Actions foi executada com Node 22 e `npm ci`.

As etapas de typecheck, lint, testes e build foram concluídas com sucesso no primeiro push.

### Organização do GitHub

Foram criadas as seguintes labels:

- `documentação`
- `melhoria`
- `nova funcionalidade`
- `segurança`
- `desempenho`

A label `bug` já existia no repositório.

Também foram abertas as Issues #1 a #17, com base nas limitações documentadas em `docs/LIMITACOES.md`.

Todas foram conferidas diretamente no código e nenhuma foi marcada como concluída.

### Pendência: GitHub Projects

A criação do quadro GitHub Projects não foi concluída nesta etapa.

A credencial disponível não possui o escopo `project`, resultando no erro `INSUFFICIENT_SCOPES` durante a solicitação à API.

A configuração permanece pendente para uma etapa posterior.

---

## Continuidade do desenvolvimento

O projeto passa a contar com um repositório público independente, documentação técnica estruturada, testes automatizados e integração contínua.

As próximas etapas deverão considerar as limitações já identificadas, as Issues abertas e o roadmap técnico, mantendo o compromisso com a confiabilidade dos resultados, a rastreabilidade das alterações e a evolução sustentável da aplicação.
